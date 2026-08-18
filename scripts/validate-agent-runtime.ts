import { db,withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { buildAgentContext,createAgentSubscription,loadAgentScope,pollAgentSignals,writeAgentObservation } from "../apps/api/src/agent-runtime";
import { createWatch,evaluateEventForWatches } from "../apps/api/src/watch-engine";

const [nodeId,workspaceId,adminId]=process.argv.slice(2);if(!nodeId||!workspaceId||!adminId)throw new Error("node workspace admin required");
const result=await withTransaction(async client=>{
  const principalId=uuidv7(),agentId=uuidv7();
  await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name) VALUES($1,$2,'agent','CI Agent')`,[principalId,nodeId]);
  await client.query(`INSERT INTO agent_identities(id,node_id,principal_id,name,kind,capabilities) VALUES($1,$2,$3,'CI Agent','external',$4)`,[agentId,nodeId,principalId,["memory","context","signals"]]);
  await client.query(`INSERT INTO agent_workspace_grants(agent_id,node_id,workspace_id,permissions,created_by) VALUES($1,$2,$3,$4,$5)`,[agentId,nodeId,workspaceId,["memory:read","memory:write","claim:write","context:read","events:read","watch:read"],adminId]);
  const object=(await client.query(`SELECT id FROM knowledge_objects WHERE node_id=$1 AND workspace_id=$2 LIMIT 1`,[nodeId,workspaceId])).rows[0];if(!object)throw new Error("bootstrap object missing");
  const observation=await writeAgentObservation(client,{principalId,nodeId,workspaceId,subjectType:"cko",subjectId:object.id,observation:"Agent observed a durable workspace-scoped fact.",confidence:.91,claim:{predicate:"agent_observed",literalValue:{value:true}}});
  const scope=await loadAgentScope(client,{principalId,nodeId,workspaceId,permission:"memory:read"});
  const context=await buildAgentContext(client,{principalId,nodeId,workspaceId,query:"What durable facts are available to this agent?",maxEvidenceItems:4});
  const otherWorkspace=uuidv7();await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'Foreign Workspace',$4)`,[otherWorkspace,nodeId,`foreign-${Date.now()}`,adminId]);
  let tenantBlocked=false;try{await loadAgentScope(client,{principalId,nodeId,workspaceId:otherWorkspace,permission:"memory:read"});}catch(e:any){tenantBlocked=e.message==="AGENT_WORKSPACE_FORBIDDEN";}
  let subjectBlocked=false;try{await writeAgentObservation(client,{principalId,nodeId,workspaceId,subjectType:"cko",subjectId:uuidv7(),observation:"must not persist"});}catch(e:any){subjectBlocked=e.message==="AGENT_SUBJECT_FORBIDDEN";}
  const claim=(await client.query(`SELECT qualifiers,created_by,epistemic_status FROM claims WHERE id=$1`,[observation.created_claim_id])).rows[0];
  const projectId=uuidv7(),subjectId=uuidv7();
  const watch=await createWatch(client,{nodeId,workspaceId,principalId,name:"Agent risk watch",intent:"Tell this agent when launch risk affects its project",impactKinds:["requires_review"],focus:{resource_ids:[projectId]},minScore:.5,cooldownSeconds:0});
  const eventId=uuidv7();await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,'Agent launch risk detected',$5::jsonb,.94)`,[eventId,nodeId,workspaceId,subjectId,JSON.stringify({risk:"agent delivery"})]);
  await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details) VALUES($1,'project',$2,'requires_review',.86,'{}'::jsonb)`,[eventId,projectId]);
  const watchMatches=await evaluateEventForWatches(client,{eventId,nodeId,workspaceId});if(!watchMatches[0]?.alert)throw new Error("AGENT_WATCH_ALERT_MISSING");
  const subscription=await createAgentSubscription(client,{principalId,nodeId,workspaceId,watchId:watch.id,eventTypes:["RISK_DETECTED"],impactKinds:["requires_review"],minConfidence:.5});
  const signals=await pollAgentSignals(client,{principalId,nodeId,workspaceId,subscriptionId:subscription.id,limit:20});
  const eventSignals=signals.filter((x:any)=>x.event_id===eventId&&!x.alert_id),alertSignals=signals.filter((x:any)=>x.alert_id===watchMatches[0].alert.id);
  if(eventSignals.length!==1||alertSignals.length!==1)throw new Error(`AGENT_SIGNAL_CHAIN_INCOMPLETE ${JSON.stringify(signals)}`);
  return {agent_id:scope.id,observation_id:observation.id,claim_id:observation.created_claim_id,claim_agent_id:claim.qualifiers.agent_id,claim_status:claim.epistemic_status,context_id:context.id,tenant_blocked:tenantBlocked,subject_blocked:subjectBlocked,permissions:scope.permissions,subscription_id:subscription.id,event_signal_count:eventSignals.length,watch_signal_count:alertSignals.length};
});
console.log(JSON.stringify(result));await db.end();
