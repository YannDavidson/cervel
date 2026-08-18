import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";
import { assembleContextPackage } from "./context";

export type AgentPermission="memory:read"|"memory:write"|"claim:write"|"context:read"|"events:read"|"watch:read";

export async function loadAgentScope(client:PoolClient,input:{principalId:string;nodeId:string;workspaceId:string;permission:AgentPermission}){
  const row=await client.query(`SELECT ai.*,g.permissions FROM agent_identities ai JOIN agent_workspace_grants g ON g.agent_id=ai.id AND g.node_id=ai.node_id WHERE ai.principal_id=$1 AND ai.node_id=$2 AND ai.enabled=true AND g.workspace_id=$3`,[input.principalId,input.nodeId,input.workspaceId]);
  if(row.rowCount!==1)throw Object.assign(new Error("AGENT_WORKSPACE_FORBIDDEN"),{statusCode:403});
  if(!(row.rows[0].permissions as string[]).includes(input.permission))throw Object.assign(new Error("AGENT_PERMISSION_DENIED"),{statusCode:403});
  return row.rows[0];
}

export async function writeAgentObservation(client:PoolClient,input:{principalId:string;nodeId:string;workspaceId:string;subjectType:string;subjectId:string;observation:string;confidence?:number;details?:Record<string,unknown>;claim?:{predicate:string;literalValue:unknown;epistemicStatus?:string}}){
  const agent=await loadAgentScope(client,{...input,permission:"memory:write"});
  if(!input.observation?.trim())throw Object.assign(new Error("OBSERVATION_REQUIRED"),{statusCode:400});
  let claimId:string|null=null;
  if(input.claim){
    if(!(agent.permissions as string[]).includes("claim:write"))throw Object.assign(new Error("AGENT_CLAIM_PERMISSION_DENIED"),{statusCode:403});
    claimId=uuidv7();
    await client.query(`INSERT INTO claims(id,node_id,subject_type,subject_id,predicate,object_kind,literal_value,literal_datatype,qualifiers,epistemic_status,confidence,created_by) VALUES($1,$2,$3,$4,$5,'literal',$6::jsonb,'application/json',$7::jsonb,$8,$9,$10)`,[claimId,input.nodeId,input.subjectType,input.subjectId,input.claim.predicate,JSON.stringify(input.claim.literalValue),JSON.stringify({workspace_id:input.workspaceId,agent_id:agent.id,source:"agent_runtime"}),input.claim.epistemicStatus??"asserted",Math.max(0,Math.min(1,input.confidence??.7)),input.principalId]);
  }
  const id=uuidv7();
  const result=await client.query(`INSERT INTO agent_observations(id,agent_id,node_id,workspace_id,subject_type,subject_id,observation,confidence,details,created_claim_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING *`,[id,agent.id,input.nodeId,input.workspaceId,input.subjectType,input.subjectId,input.observation.trim(),Math.max(0,Math.min(1,input.confidence??.7)),JSON.stringify(input.details??{}),claimId]);
  return result.rows[0];
}

export async function buildAgentContext(client:PoolClient,input:{principalId:string;nodeId:string;workspaceId:string;query:string;taskType?:string;profile?:string;maxEvidenceItems?:number}){
  await loadAgentScope(client,{...input,permission:"context:read"});
  return assembleContextPackage(client,{nodeId:input.nodeId,workspaceId:input.workspaceId,principalId:input.principalId,query:input.query,taskType:input.taskType,profile:input.profile,asOf:null,libraryIds:[],maxEvidenceItems:input.maxEvidenceItems});
}

export async function pollAgentSignals(client:PoolClient,input:{principalId:string;nodeId:string;workspaceId:string;subscriptionId:string;limit?:number}){
  const agent=await loadAgentScope(client,{...input,permission:"events:read"});
  const subResult=await client.query(`SELECT * FROM agent_subscriptions WHERE id=$1 AND agent_id=$2 AND node_id=$3 AND workspace_id=$4 AND enabled=true`,[input.subscriptionId,agent.id,input.nodeId,input.workspaceId]);
  if(subResult.rowCount!==1)throw Object.assign(new Error("AGENT_SUBSCRIPTION_NOT_FOUND"),{statusCode:404});
  const sub=subResult.rows[0],limit=Math.max(1,Math.min(100,input.limit??30));
  const events=await client.query(`SELECT ke.id AS event_id,NULL::uuid AS alert_id,ke.observed_at AS occurred_at,ke.event_type,ke.subject_type,ke.subject_id,ke.confidence,ke.summary,ke.details,NULL::text AS severity,NULL::jsonb AS why_now FROM knowledge_events ke WHERE ke.node_id=$1 AND ke.workspace_id=$2 AND ke.observed_at>$3 AND ke.confidence >= $4 AND (cardinality($5::text[])=0 OR ke.event_type=ANY($5::text[])) UNION ALL SELECT wa.event_id,wa.id AS alert_id,wa.surfaced_at AS occurred_at,ke.event_type,ke.subject_type,ke.subject_id,ke.confidence,wa.title AS summary,ke.details,wa.severity,wa.why_now FROM watch_alerts wa JOIN knowledge_events ke ON ke.id=wa.event_id WHERE wa.node_id=$1 AND wa.workspace_id=$2 AND wa.principal_id=$6 AND wa.surfaced_at>$3 AND ($7::uuid IS NULL OR wa.watch_id=$7) ORDER BY occurred_at ASC LIMIT $8`,[input.nodeId,input.workspaceId,sub.cursor_at,sub.min_confidence,sub.event_types,input.principalId,sub.watch_id,limit]);
  for(const signal of events.rows)await client.query(`INSERT INTO agent_delivery_receipts(id,subscription_id,agent_id,event_id,alert_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[uuidv7(),sub.id,agent.id,signal.event_id,signal.alert_id]);
  if(events.rows.length)await client.query(`UPDATE agent_subscriptions SET cursor_at=$2 WHERE id=$1`,[sub.id,events.rows[events.rows.length-1].occurred_at]);
  return events.rows;
}
