import { db,withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { createKnowledgeObject } from "../apps/api/src/objects";
import { assertAgentProvisioner,buildAgentContext,createAgentSubscription,loadAgentScope,pollAgentSignals,writeAgentObservation } from "../apps/api/src/agent-runtime";
import { createWatch,evaluateEventForWatches } from "../apps/api/src/watch-engine";

async function main(){
  const [nodeId,workspaceId,adminId]=process.argv.slice(2);
  if(!nodeId||!workspaceId||!adminId)throw new Error("node workspace admin required");
  const result=await withTransaction(async client=>{
    await assertAgentProvisioner(client,adminId,nodeId);
    const nonAdminId=uuidv7();
    await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name,attributes) VALUES($1,$2,'human','Non Admin','{}'::jsonb)`,[nonAdminId,nodeId]);
    let provisioningBlocked=false;
    try{await assertAgentProvisioner(client,nonAdminId,nodeId);}catch(e:any){provisioningBlocked=e.message==="AGENT_PROVISIONING_FORBIDDEN";}

    const principalId=uuidv7(),agentId=uuidv7();
    await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name) VALUES($1,$2,'agent','CI Agent')`,[principalId,nodeId]);
    await client.query(`INSERT INTO agent_identities(id,node_id,principal_id,name,kind,capabilities) VALUES($1,$2,$3,'CI Agent','external',$4)`,[agentId,nodeId,principalId,["memory","context","signals"]]);
    await client.query(`INSERT INTO agent_workspace_grants(agent_id,node_id,workspace_id,permissions,created_by) VALUES($1,$2,$3,$4,$5)`,[agentId,nodeId,workspaceId,["memory:read","memory:write","claim:write","context:read","events:read","watch:read"],adminId]);

    const nodeAuthority=(await client.query(`SELECT slug FROM nodes WHERE id=$1`,[nodeId])).rows[0]?.slug;
    if(!nodeAuthority)throw new Error("node authority missing");
    const object=await createKnowledgeObject(client,{nodeId,workspaceId,type:"document",title:"Agent Runtime CI Object",summary:"Seed object for agent runtime validation",createdBy:adminId,nodeAuthority});
    const observation=await writeAgentObservation(client,{principalId,nodeId,workspaceId,subjectType:"cko",subjectId:object.id,observation:"Agent observed a durable workspace-scoped fact.",confidence:.91,claim:{predicate:"agent_observed",literalValue:{value:true}}});
    const scope=await loadAgentScope(client,{principalId,nodeId,workspaceId,permission:"memory:read"});
    const context=await buildAgentContext(client,{principalId,nodeId,workspaceId,query:"What durable facts are available to this agent?",maxEvidenceItems:4});

    const otherWorkspace=uuidv7();
    await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'Foreign Workspace',$4)`,[otherWorkspace,nodeId,`foreign-${Date.now()}`,adminId]);
    let tenantBlocked=false;try{await loadAgentScope(client,{principalId,nodeId,workspaceId:otherWorkspace,permission:"memory:read"});}catch(e:any){tenantBlocked=e.message==="AGENT_WORKSPACE_FORBIDDEN";}
    let subjectBlocked=false;try{await writeAgentObservation(client,{principalId,nodeId,workspaceId,subjectType:"cko",subjectId:uuidv7(),observation:"must not persist"});}catch(e:any){subjectBlocked=e.message==="AGENT_SUBJECT_FORBIDDEN";}
    const claim=(await client.query(`SELECT qualifiers,epistemic_status FROM claims WHERE id=$1`,[observation.created_claim_id])).rows[0];

    const projectId=uuidv7(),subjectId=uuidv7();
    const watch=await createWatch(client,{nodeId,workspaceId,principalId,name:"Agent risk watch",intent:"Tell this agent when launch risk affects its project",impactKinds:["requires_review"],focus:{resource_ids:[projectId]},minScore:.5,cooldownSeconds:0});
    const eventId=uuidv7();
    await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,'Agent launch risk detected',$5::jsonb,.94)`,[eventId,nodeId,workspaceId,subjectId,JSON.stringify({risk:"agent delivery"})]);
    await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details) VALUES($1,'project',$2,'requires_review',.86,'{}'::jsonb)`,[eventId,projectId]);
    const watchMatches=await evaluateEventForWatches(client,{eventId,nodeId,workspaceId});
    if(!watchMatches[0]?.alert)throw new Error("AGENT_WATCH_ALERT_MISSING");
    const subscription=await createAgentSubscription(client,{principalId,nodeId,workspaceId,watchId:watch.id,eventTypes:["RISK_DETECTED"],impactKinds:["requires_review"],minConfidence:.5});
    const signals=await pollAgentSignals(client,{principalId,nodeId,workspaceId,subscriptionId:subscription.id,limit:20});
    const eventSignals=signals.filter((x:any)=>x.event_id===eventId&&!x.alert_id),alertSignals=signals.filter((x:any)=>x.alert_id===watchMatches[0].alert.id);
    if(eventSignals.length!==1||alertSignals.length!==1)throw new Error(`AGENT_SIGNAL_CHAIN_INCOMPLETE ${JSON.stringify(signals)}`);

    const replaySubscription=await createAgentSubscription(client,{principalId,nodeId,workspaceId,eventTypes:["ENTITY_ADDED"],minConfidence:0});
    const sharedTime=new Date().toISOString();
    const replayEventA=uuidv7(),replayEventB=uuidv7();
    await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence,observed_at) VALUES($1,$2,$3,'ENTITY_ADDED','entity',$4,'Replay A','{}'::jsonb,.8,$6),($5,$2,$3,'ENTITY_ADDED','entity',$4,'Replay B','{}'::jsonb,.8,$6)`,[replayEventA,nodeId,workspaceId,subjectId,replayEventB,sharedTime]);
    const replayFirst=await pollAgentSignals(client,{principalId,nodeId,workspaceId,subscriptionId:replaySubscription.id,limit:1});
    const replaySecond=await pollAgentSignals(client,{principalId,nodeId,workspaceId,subscriptionId:replaySubscription.id,limit:1});
    const replayIds=[...replayFirst,...replaySecond].map((x:any)=>x.event_id);
    const replaySafe=replayIds.length===2&&new Set(replayIds).size===2&&replayIds.includes(replayEventA)&&replayIds.includes(replayEventB);

    return {agent_id:scope.id,observation_id:observation.id,claim_id:observation.created_claim_id,claim_agent_id:claim.qualifiers.agent_id,claim_status:claim.epistemic_status,context_id:context.id,provisioning_blocked:provisioningBlocked,tenant_blocked:tenantBlocked,subject_blocked:subjectBlocked,subscription_id:subscription.id,event_signal_count:eventSignals.length,watch_signal_count:alertSignals.length,replay_safe:replaySafe};
  });
  console.log(JSON.stringify(result));
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.end());
