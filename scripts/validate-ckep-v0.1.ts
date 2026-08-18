import { db, withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import { mapScopedKnowledgeEventToCkep } from "../packages/ckep/src/legacy";
import { validateCkep } from "../packages/ckep/src";

async function main(){
  const [nodeId,workspaceId,principalId]=process.argv.slice(2);
  if(!nodeId||!workspaceId||!principalId)throw new Error("node workspace principal required");
  const result=await withTransaction(async client=>{
    const node=(await client.query(`SELECT slug FROM nodes WHERE id=$1`,[nodeId])).rows[0];
    if(!node)throw new Error("NODE_MISSING");
    const otherWorkspace=uuidv7();
    await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES($1,$2,$3,'CKEP Foreign',$4)`,[otherWorkspace,nodeId,`ckep-${Date.now()}`,principalId]);
    const subjectId=uuidv7(),eventId=uuidv7(),impactId=uuidv7();
    await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,summary,details,confidence,observed_at,effective_at) VALUES($1,$2,$3,'RISK_DETECTED','project',$4,'CKEP launch risk',$5::jsonb,.93,'2026-08-18T20:00:00Z','2026-09-01T00:00:00Z')`,[eventId,nodeId,workspaceId,subjectId,JSON.stringify({fixture:true})]);
    await client.query(`INSERT INTO knowledge_event_impacts(event_id,impacted_type,impacted_id,impact_kind,confidence,details) VALUES($1,'decision',$2,'requires_review',.87,'{}'::jsonb)`,[eventId,impactId]);
    const row=(await client.query(`SELECT * FROM knowledge_events WHERE id=$1`,[eventId])).rows[0];
    const impacts=(await client.query(`SELECT impacted_type,impacted_id,impact_kind,confidence,details FROM knowledge_event_impacts WHERE event_id=$1`,[eventId])).rows;
    const envelope=mapScopedKnowledgeEventToCkep({authority:node.slug,nodeId,workspaceId,row,impacts,sequence:1});
    const duplicate=mapScopedKnowledgeEventToCkep({authority:node.slug,nodeId,workspaceId,row,impacts,sequence:1});
    const validated=validateCkep(envelope);
    let workspaceBlocked=false;try{mapScopedKnowledgeEventToCkep({authority:node.slug,nodeId,workspaceId:otherWorkspace,row,impacts,sequence:1});}catch(e:any){workspaceBlocked=e.message==="CKEP_WORKSPACE_SCOPE_MISMATCH";}
    let nodeBlocked=false;try{mapScopedKnowledgeEventToCkep({authority:node.slug,nodeId:uuidv7(),workspaceId,row,impacts,sequence:1});}catch(e:any){nodeBlocked=e.message==="CKEP_NODE_SCOPE_MISMATCH";}
    return {
      valid:validated.ok,
      identity_scoped:envelope.event.id.includes(`/workspaces/${encodeURIComponent(workspaceId)}/events/${encodeURIComponent(eventId)}`),
      temporal_distinct:envelope.temporal.observed_at!==envelope.temporal.effective_at,
      impact_mapped:envelope.impact?.[0]?.severity==="high",
      idempotent:envelope.integrity.idempotency_key===duplicate.integrity.idempotency_key&&envelope.integrity.hash===duplicate.integrity.hash,
      workspace_blocked:workspaceBlocked,
      node_blocked:nodeBlocked,
      provenance_mapped:envelope.provenance.method==="legacy_knowledge_events_mapping",
      sequence:envelope.integrity.sequence
    };
  });
  console.log(JSON.stringify(result));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.end());
