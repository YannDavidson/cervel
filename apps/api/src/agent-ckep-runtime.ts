import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";
import { loadAgentScope } from "./agent-runtime";

export async function pollAgentCkepSignals(client:PoolClient,input:{principalId:string;nodeId:string;workspaceId:string;subscriptionId:string;limit?:number}){
  const agent=await loadAgentScope(client,{...input,permission:"events:read"});
  const subResult=await client.query(`SELECT * FROM agent_subscriptions WHERE id=$1 AND agent_id=$2 AND node_id=$3 AND workspace_id=$4 AND enabled=true FOR UPDATE`,[input.subscriptionId,agent.id,input.nodeId,input.workspaceId]);
  if(subResult.rowCount!==1)throw Object.assign(new Error("AGENT_SUBSCRIPTION_NOT_FOUND"),{statusCode:404});
  const sub=subResult.rows[0],limit=Math.max(1,Math.min(100,input.limit??30));
  const rows=await client.query(`SELECT j.id AS journal_event_id,j.sequence,j.event_uri,j.event_type,j.subject_type,j.subject_uri,j.observed_at,j.envelope,d.knowledge_event_id,d.impact_count,d.watch_match_count FROM ckep_event_journal j JOIN ckep_reactive_dispatches d ON d.journal_event_id=j.id AND d.status='succeeded' WHERE j.node_id=$1 AND j.workspace_id=$2 AND j.sequence>$3 AND (cardinality($4::text[])=0 OR j.event_type=ANY($4::text[])) AND COALESCE((j.envelope->'epistemics'->>'confidence')::real,0)>=$5 AND (cardinality($6::text[])=0 OR EXISTS(SELECT 1 FROM knowledge_event_impacts kei WHERE kei.event_id=d.knowledge_event_id AND kei.impact_kind=ANY($6::text[]))) ORDER BY j.sequence ASC LIMIT $7`,[input.nodeId,input.workspaceId,sub.ckep_cursor_sequence,sub.event_types,sub.min_confidence,sub.impact_kinds,limit]);
  for(const row of rows.rows)await client.query(`INSERT INTO agent_delivery_receipts(id,subscription_id,agent_id,event_id,ckep_journal_event_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[uuidv7(),sub.id,agent.id,row.knowledge_event_id,row.journal_event_id]);
  if(rows.rows.length)await client.query(`UPDATE agent_subscriptions SET ckep_cursor_sequence=$2 WHERE id=$1`,[sub.id,rows.rows[rows.rows.length-1].sequence]);
  return rows.rows;
}
