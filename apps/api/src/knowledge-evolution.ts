import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";

export type EvolutionType = "introduced"|"confirmed"|"modified"|"contradicted"|"superseded"|"withdrawn";

type Fragment = { id:string; text_content:string; ordinal:number };
function normalize(text:string){ return text.trim().replace(/\s+/g," ").toLowerCase(); }
function tokens(text:string){ return new Set(normalize(text).split(/[^a-z0-9]+/).filter(Boolean)); }
function similarity(a:string,b:string){ const x=tokens(a),y=tokens(b); if(!x.size&&!y.size)return 1; let hit=0; for(const t of x)if(y.has(t))hit++; return hit/Math.max(1,new Set([...x,...y]).size); }

export async function semanticDiffArtifacts(client:PoolClient,input:{nodeId:string;workspaceId:string;ckoId:string;previousArtifactId?:string|null;currentArtifactId:string;previousVersion?:number|null;currentVersion:number}){
  const load=async(id:string|null|undefined):Promise<Fragment[]>=>!id?[]:(await client.query(`SELECT id,text_content,ordinal FROM fragments WHERE artifact_id=$1 ORDER BY ordinal`,[id])).rows;
  const before=await load(input.previousArtifactId),after=await load(input.currentArtifactId); const used=new Set<string>();
  const added:any[]=[],removed:any[]=[],modified:any[]=[]; let unchanged=0;
  for(const current of after){ let best:Fragment|undefined,bestScore=0; for(const previous of before){if(used.has(previous.id))continue;const score=similarity(previous.text_content,current.text_content);if(score>bestScore){best=previous;bestScore=score;}}
    if(best&&bestScore>=0.92){used.add(best.id);unchanged++;continue;} if(best&&bestScore>=0.35){used.add(best.id);modified.push({previous_fragment_id:best.id,current_fragment_id:current.id,before:best.text_content,after:current.text_content,similarity:bestScore});} else added.push({fragment_id:current.id,text:current.text_content}); }
  for(const previous of before)if(!used.has(previous.id))removed.push({fragment_id:previous.id,text:previous.text_content});
  const summary=`${added.length} added, ${removed.length} removed, ${modified.length} modified, ${unchanged} unchanged`;
  const existing=await client.query(`SELECT * FROM knowledge_diffs WHERE cko_id=$1 AND current_artifact_id=$2`,[input.ckoId,input.currentArtifactId]); if(existing.rowCount)return existing.rows[0];
  const id=uuidv7(); await client.query(`INSERT INTO knowledge_diffs(id,node_id,workspace_id,cko_id,previous_artifact_id,current_artifact_id,previous_version,current_version,summary,added,removed,modified,unchanged_count,confidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14)`,[id,input.nodeId,input.workspaceId,input.ckoId,input.previousArtifactId??null,input.currentArtifactId,input.previousVersion??null,input.currentVersion,summary,JSON.stringify(added),JSON.stringify(removed),JSON.stringify(modified),unchanged,modified.length?0.82:0.9]);
  return (await client.query(`SELECT * FROM knowledge_diffs WHERE id=$1`,[id])).rows[0];
}

function sameSemanticKey(a:any,b:any){return a.semantic_subject_entity_id&&a.semantic_subject_entity_id===b.semantic_subject_entity_id&&a.semantic_predicate&&a.semantic_predicate===b.semantic_predicate;}
function sameObject(a:any,b:any){return a.semantic_object_entity_id? a.semantic_object_entity_id===b.semantic_object_entity_id : JSON.stringify(a.literal_value)===JSON.stringify(b.literal_value);}
function polarity(c:any){return String(c.qualifiers?.polarity??"affirmed");}

export async function evolveClaimsForObject(client:PoolClient,input:{nodeId:string;workspaceId:string;ckoId:string;diffId:string;previousArtifactId?:string|null;currentArtifactId:string}){
  const current=(await client.query(`SELECT DISTINCT c.* FROM claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN fragments f ON f.id=ce.fragment_id WHERE f.cko_id=$1 AND f.artifact_id=$2`,[input.ckoId,input.currentArtifactId])).rows;
  const previous=!input.previousArtifactId?[]:(await client.query(`SELECT DISTINCT c.* FROM claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN fragments f ON f.id=ce.fragment_id WHERE f.cko_id=$1 AND f.artifact_id=$2`,[input.ckoId,input.previousArtifactId])).rows;
  const evolutions:any[]=[]; const matchedPrevious=new Set<string>();
  const record=async(type:EvolutionType,prev:any|null,cur:any|null,confidence:number,details:any={})=>{const id=uuidv7();await client.query(`INSERT INTO claim_evolutions(id,node_id,workspace_id,cko_id,previous_claim_id,current_claim_id,evolution_type,knowledge_diff_id,confidence,details,effective_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,COALESCE($11,now()))`,[id,input.nodeId,input.workspaceId,input.ckoId,prev?.id??null,cur?.id??null,type,input.diffId,confidence,JSON.stringify(details),cur?.effective_at??null]); evolutions.push({id,evolution_type:type,previous_claim_id:prev?.id??null,current_claim_id:cur?.id??null,confidence,details});};
  for(const cur of current){const candidates=previous.filter((p:any)=>sameSemanticKey(p,cur));const exact=candidates.find((p:any)=>sameObject(p,cur)&&polarity(p)===polarity(cur)); if(exact){matchedPrevious.add(exact.id);await record("confirmed",exact,cur,0.95);continue;} const prior=candidates[0]; if(!prior){await record("introduced",null,cur,0.9);continue;} matchedPrevious.add(prior.id); const contradiction=polarity(prior)!==polarity(cur); const type:EvolutionType=contradiction?"contradicted":"modified"; await client.query(`UPDATE claims SET temporal_status=$2,valid_until=COALESCE(valid_until,now()),superseded_by_claim_id=$3 WHERE id=$1`,[prior.id,contradiction?"contradicted":"superseded",cur.id]); await record(type,prior,cur,contradiction?0.9:0.84,{predicate:cur.semantic_predicate}); }
  for(const prev of previous)if(!matchedPrevious.has(prev.id)){await client.query(`UPDATE claims SET temporal_status='withdrawn',valid_until=COALESCE(valid_until,now()) WHERE id=$1`,[prev.id]);await record("withdrawn",prev,null,0.78);}
  return evolutions;
}

const eventType:Record<EvolutionType,string>={introduced:"CLAIM_INTRODUCED",confirmed:"CLAIM_CONFIRMED",modified:"CLAIM_MODIFIED",contradicted:"CLAIM_CONTRADICTED",superseded:"CLAIM_SUPERSEDED",withdrawn:"CLAIM_WITHDRAWN"};
export async function emitKnowledgeEvents(client:PoolClient,input:{nodeId:string;workspaceId:string;ckoId:string;diffId:string;evolutions:any[]}){
  const events:any[]=[]; for(const evolution of input.evolutions){const id=uuidv7(),type=eventType[evolution.evolution_type as EvolutionType];const subjectId=evolution.current_claim_id??evolution.previous_claim_id;const summary=`Claim ${evolution.evolution_type} in knowledge object ${input.ckoId}`;await client.query(`INSERT INTO knowledge_events(id,node_id,workspace_id,event_type,subject_type,subject_id,cko_id,knowledge_diff_id,previous_claim_id,current_claim_id,summary,details,confidence) VALUES($1,$2,$3,$4,'claim',$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,[id,input.nodeId,input.workspaceId,type,subjectId,input.ckoId,input.diffId,evolution.previous_claim_id,evolution.current_claim_id,summary,JSON.stringify(evolution.details??{}),evolution.confidence]);events.push({id,event_type:type,subject_id:subjectId,summary,confidence:evolution.confidence});} return events;
}

export async function analyzeKnowledgeEvolution(client:PoolClient,input:{nodeId:string;workspaceId:string;ckoId:string;previousArtifactId?:string|null;currentArtifactId:string;previousVersion?:number|null;currentVersion:number}){const diff=await semanticDiffArtifacts(client,input);const evolutions=await evolveClaimsForObject(client,{...input,diffId:diff.id});const events=await emitKnowledgeEvents(client,{nodeId:input.nodeId,workspaceId:input.workspaceId,ckoId:input.ckoId,diffId:diff.id,evolutions});return {diff,evolutions,events};}

export async function whatChanged(client:PoolClient,input:{nodeId:string;workspaceId:string;since?:string;ckoId?:string;limit?:number}){const since=input.since??new Date(Date.now()-7*86400000).toISOString();const params:any[]=[input.nodeId,input.workspaceId,since];let filter="";if(input.ckoId){params.push(input.ckoId);filter=` AND ke.cko_id=$${params.length}`;}params.push(Math.max(1,Math.min(100,input.limit??30)));const rows=await client.query(`SELECT ke.*,kd.summary AS diff_summary,kd.added,kd.removed,kd.modified FROM knowledge_events ke LEFT JOIN knowledge_diffs kd ON kd.id=ke.knowledge_diff_id WHERE ke.node_id=$1 AND ke.workspace_id=$2 AND ke.observed_at >= $3${filter} ORDER BY ke.observed_at DESC LIMIT $${params.length}`,params);return rows.rows;}
