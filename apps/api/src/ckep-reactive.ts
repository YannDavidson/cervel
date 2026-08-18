import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";
import { inferDependenciesFromKnowledge,propagateKnowledgeImpact } from "./impact-engine";
import { evaluateEventForWatches } from "./watch-engine";

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tail=(uri:string)=>uri.split('/').filter(Boolean).pop()??'';

async function projectJournalEvent(client:PoolClient,row:any){
  const envelope=row.envelope as any,eventId=tail(String(envelope.event.id)),subjectId=tail(String(envelope.subject.uri));
  if(!UUID_RE.test(subjectId))throw Object.assign(new Error("CKEP_REACTIVE_SUBJECT_ID_UNSUPPORTED"),{statusCode:422});
  const existingLegacy=UUID_RE.test(eventId)?await client.query(`SELECT * FROM knowledge_events WHERE id=$1 AND node_id=$2 AND workspace_id=$3`,[eventId,row.node_id,row.workspace_id]):{rowCount:0,rows:[]} as any;
  if(existingLegacy.rowCount===1)return existingLegacy.rows[0];
  const id=UUID_RE.test(eventId)?eventId:uuidv7();
  const prev=tail(String(envelope.transition?.previous?.uri??'')),cur=tail(String(envelope.transition?.current?.uri??''));
  const previousClaimId=UUID_RE.test(prev)?prev:null,currentClaimId=UUID_RE.test(cur)?cur:null;
  const ckoId=envelope.subject.type==='cko'?subjectId:null;
  const details={ckep_event_uri:envelope.event.id,ckep_sequence:envelope.integrity.sequence,ckep_provenance:envelope.provenance,ckep_causality:envelope.causality??null,ckep_extensions:envelope.extensions??{}};
  const inserted=await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,cko_id,previous_claim_id,current_claim_id,summary,details,confidence,observed_at,effective_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14) ON CONFLICT(id) DO NOTHING RETURNING *`,[id,row.node_id,row.workspace_id,envelope.event.type,envelope.subject.type,subjectId,ckoId,previousClaimId,currentClaimId,String(envelope.provenance?.metadata?.legacy_summary??envelope.event.type),JSON.stringify(details),Number(envelope.epistemics?.confidence??0),envelope.temporal.observed_at,envelope.temporal.effective_at??null]);
  if(inserted.rowCount===1)return inserted.rows[0];
  const scoped=await client.query(`SELECT * FROM knowledge_events WHERE id=$1 AND node_id=$2 AND workspace_id=$3`,[id,row.node_id,row.workspace_id]);
  if(scoped.rowCount!==1)throw Object.assign(new Error("CKEP_REACTIVE_EVENT_ID_SCOPE_CONFLICT"),{statusCode:409});
  return scoped.rows[0];
}

export async function dispatchCkepJournalEvent(client:PoolClient,input:{journalEventId:string;nodeId:string;workspaceId:string}){
  const journal=await client.query(`SELECT * FROM ckep_event_journal WHERE id=$1 AND node_id=$2 AND workspace_id=$3`,[input.journalEventId,input.nodeId,input.workspaceId]);
  if(journal.rowCount!==1)throw Object.assign(new Error("CKEP_JOURNAL_EVENT_NOT_FOUND"),{statusCode:404});
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[`ckep-reactive:${input.nodeId}:${input.workspaceId}:${input.journalEventId}`]);
  const existing=await client.query(`SELECT * FROM ckep_reactive_dispatches WHERE journal_event_id=$1 AND node_id=$2 AND workspace_id=$3`,[input.journalEventId,input.nodeId,input.workspaceId]);
  if(existing.rowCount===1&&existing.rows[0].status==='succeeded')return existing.rows[0];
  const knowledgeEvent=await projectJournalEvent(client,journal.rows[0]);
  await client.query(`INSERT INTO ckep_reactive_dispatches(journal_event_id,node_id,workspace_id,knowledge_event_id,status) VALUES($1,$2,$3,$4,'processing') ON CONFLICT(journal_event_id) DO UPDATE SET status='processing',error=NULL,started_at=now(),completed_at=NULL WHERE ckep_reactive_dispatches.node_id=EXCLUDED.node_id AND ckep_reactive_dispatches.workspace_id=EXCLUDED.workspace_id`,[input.journalEventId,input.nodeId,input.workspaceId,knowledgeEvent.id]);
  try{
    await inferDependenciesFromKnowledge(client,{nodeId:input.nodeId,workspaceId:input.workspaceId});
    const impact=await propagateKnowledgeImpact(client,{eventId:knowledgeEvent.id,nodeId:input.nodeId,workspaceId:input.workspaceId,maxDepth:4,confidenceFloor:.2});
    const watches=await evaluateEventForWatches(client,{eventId:knowledgeEvent.id,nodeId:input.nodeId,workspaceId:input.workspaceId});
    const row=await client.query(`UPDATE ckep_reactive_dispatches SET status='succeeded',impact_run_id=$2,impact_count=$3,watch_match_count=$4,completed_at=now() WHERE journal_event_id=$1 AND node_id=$5 AND workspace_id=$6 RETURNING *`,[input.journalEventId,impact.run_id,impact.impacted_count,watches.length,input.nodeId,input.workspaceId]);return row.rows[0];
  }catch(error:any){await client.query(`UPDATE ckep_reactive_dispatches SET status='failed',error=$2,completed_at=now() WHERE journal_event_id=$1 AND node_id=$3 AND workspace_id=$4`,[input.journalEventId,String(error?.message??error),input.nodeId,input.workspaceId]);throw error;}
}

export async function dispatchPendingCkep(client:PoolClient,input:{nodeId:string;workspaceId:string;limit?:number}){const rows=await client.query(`SELECT j.id FROM ckep_event_journal j LEFT JOIN ckep_reactive_dispatches d ON d.journal_event_id=j.id WHERE j.node_id=$1 AND j.workspace_id=$2 AND (d.journal_event_id IS NULL OR d.status='failed') ORDER BY j.sequence ASC LIMIT $3`,[input.nodeId,input.workspaceId,Math.max(1,Math.min(200,input.limit??50))]);const out=[];for(const row of rows.rows)out.push(await dispatchCkepJournalEvent(client,{journalEventId:row.id,nodeId:input.nodeId,workspaceId:input.workspaceId}));return out;}
