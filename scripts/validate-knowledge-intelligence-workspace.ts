import { db, withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { createKnowledgeObject } from "../apps/api/src/objects";
import { loadKnowledgeIntelligenceWorkspace } from "../apps/api/src/intelligence-workspace";
import { renderKnowledgeIntelligenceWorkspace } from "../apps/web/src/intelligence-workspace-ui";

async function main(){
  const [nodeId,workspaceId,adminId]=process.argv.slice(2);
  if(!nodeId||!workspaceId||!adminId) throw new Error("node workspace admin required");
  const result=await withTransaction(async client=>{
    const node=(await client.query(`SELECT slug FROM nodes WHERE id=$1`,[nodeId])).rows[0];
    if(!node) throw new Error("node missing");
    const otherWorkspace=uuidv7();
    await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'Other Workspace',$4)`,[otherWorkspace,nodeId,`kiw-other-${Date.now()}`,adminId]);

    const decision=await createKnowledgeObject(client,{nodeId,workspaceId,type:"decision",title:"Ship Project Alpha",summary:"Decision intelligence fixture",createdBy:adminId,nodeAuthority:node.slug});
    const foreign=await createKnowledgeObject(client,{nodeId,workspaceId:otherWorkspace,type:"decision",title:"Foreign Decision",summary:"Must remain isolated",createdBy:adminId,nodeAuthority:node.slug});

    const fragmentId=uuidv7();
    await client.query(`INSERT INTO fragments(id,node_id,cko_id,type,ordinal,text_content) VALUES($1,$2,$3,'text',0,'Project Alpha launches in September')`,[fragmentId,nodeId,decision.id]);
    const claimA=uuidv7(),claimB=uuidv7();
    await client.query(`INSERT INTO claims(id,node_id,subject_type,subject_id,predicate,object_kind,literal_value,literal_datatype,epistemic_status,confidence,created_by) VALUES($1,$2,'cko',$3,'launch_month','literal',$4::jsonb,'application/json','claimed',.9,$5),($6,$2,'cko',$3,'launch_month','literal',$7::jsonb,'application/json','claimed',.8,$5)`,[claimA,nodeId,decision.id,JSON.stringify("September"),adminId,claimB,JSON.stringify("October")]);
    await client.query(`INSERT INTO claim_evidence(claim_id,fragment_id,evidence_role) VALUES($1,$3,'support'),($2,$3,'support')`,[claimA,claimB,fragmentId]);
    const conflictId=uuidv7();
    await client.query(`INSERT INTO claim_conflicts(id,node_id,claim_a_id,claim_b_id,conflict_type,confidence,details) VALUES($1,$2,$3,$4,'value',.88,'{}'::jsonb)`,[conflictId,nodeId,claimA,claimB]);

    const storage=(await client.query(`SELECT id FROM storage_locations WHERE node_id=$1 ORDER BY is_primary DESC LIMIT 1`,[nodeId])).rows[0];
    if(!storage) throw new Error("storage missing");
    const artifactId=uuidv7();
    await client.query(`INSERT INTO artifacts(id,node_id,cko_id,role,mime_type,storage_location_id,object_key,sha256,size_bytes) VALUES($1,$2,$3,'snapshot','text/plain',$4,$5,$6,10)`,[artifactId,nodeId,decision.id,storage.id,`kiw/${artifactId}`,'0'.repeat(64)]);
    const diffId=uuidv7();
    await client.query(`INSERT INTO knowledge_diffs(id,node_id,workspace_id,cko_id,current_artifact_id,current_version,diff_kind,summary,added,removed,modified,confidence) VALUES($1,$2,$3,$4,$5,2,'semantic','Launch month changed','[]'::jsonb,'[]'::jsonb,$6::jsonb,.91)`,[diffId,nodeId,workspaceId,decision.id,artifactId,JSON.stringify([{field:"launch_month",from:"September",to:"October"}])]);

    const eventId=uuidv7();
    await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,cko_id,knowledge_diff_id,summary,confidence) VALUES($1,$2,$3,'DECISION_CHANGED','decision',$4,$4,$5,'Project Alpha launch decision changed',.94)`,[eventId,nodeId,workspaceId,decision.id,diffId]);
    await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details) VALUES($1,'decision',$2,'requires_review',.89,'{}'::jsonb)`,[eventId,decision.id]);

    const sourceId=uuidv7();
    await client.query(`INSERT INTO source_connections(id,node_id,workspace_id,principal_id,provider,account_subject,account_email,status) VALUES($1,$2,$3,$4,'google_drive',$5,'kiw@example.com','connected')`,[sourceId,nodeId,workspaceId,adminId,`kiw-${sourceId}`]);
    await client.query(`INSERT INTO knowledge_health_notifications(id,node_id,workspace_id,kind,severity,title,message,dedupe_key) VALUES($1,$2,$3,'source_stale','warning','Source freshness','A watched source is stale',$4)`,[uuidv7(),nodeId,workspaceId,`kiw-health-${Date.now()}`]);

    const agentPrincipal=uuidv7(),agentId=uuidv7();
    await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name) VALUES($1,$2,'agent','Workspace Intelligence Agent')`,[agentPrincipal,nodeId]);
    await client.query(`INSERT INTO agent_identities(id,node_id,principal_id,name,kind,capabilities) VALUES($1,$2,$3,'Workspace Intelligence Agent','internal',$4)`,[agentId,nodeId,agentPrincipal,["memory","signals"]]);
    await client.query(`INSERT INTO agent_workspace_grants(agent_id,node_id,workspace_id,permissions,created_by) VALUES($1,$2,$3,$4,$5)`,[agentId,nodeId,workspaceId,["memory:read","events:read"],adminId]);

    const local=await loadKnowledgeIntelligenceWorkspace(client,{node_id:nodeId,workspace_id:workspaceId,principal_id:adminId});
    const foreignView=await loadKnowledgeIntelligenceWorkspace(client,{node_id:nodeId,workspace_id:otherWorkspace,principal_id:adminId});
    const html=renderKnowledgeIntelligenceWorkspace();
    const navLabels=["Knowledge Graph","Timeline","Sources","Changes","Claims","Decisions","Contradictions","Knowledge Health","Agents","Ask CERVEL"];
    const uiComplete=navLabels.every(label=>html.includes(label));
    const localComplete=local.decisions.some((x:any)=>x.id===decision.id)&&local.timeline.some((x:any)=>x.id===eventId)&&local.changes.some((x:any)=>x.id===diffId)&&local.claims.some((x:any)=>x.id===claimA)&&local.contradictions.some((x:any)=>x.id===conflictId)&&local.sources.some((x:any)=>x.id===sourceId)&&local.health.length>0&&local.agents.some((x:any)=>x.id===agentId);
    const isolated=!foreignView.decisions.some((x:any)=>x.id===decision.id)&&!foreignView.timeline.some((x:any)=>x.id===eventId)&&!foreignView.claims.some((x:any)=>x.id===claimA)&&!foreignView.sources.some((x:any)=>x.id===sourceId)&&!foreignView.agents.some((x:any)=>x.id===agentId)&&foreignView.decisions.some((x:any)=>x.id===foreign.id);
    return {ui_complete:uiComplete,local_complete:localComplete,workspace_isolated:isolated,health_score:local.overview.health_score,views:{timeline:local.timeline.length,changes:local.changes.length,claims:local.claims.length,decisions:local.decisions.length,contradictions:local.contradictions.length,sources:local.sources.length,health:local.health.length,agents:local.agents.length}};
  });
  console.log(JSON.stringify(result));
}

main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.end());
