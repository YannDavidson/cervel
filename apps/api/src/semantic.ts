import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function normalizeName(value: string): string { return value.trim().replace(/\s+/g, " ").toLowerCase(); }
function inferKind(value: string): string {
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(value)) return "named_entity";
  if (/\b(?:city|state|country|municipality|territory|district)\b/i.test(value)) return "place";
  return "concept";
}
function simpleTriple(text: string): { subject: string; predicate: string; object: string; polarity: "affirmed" | "denied" } | null {
  const compact = text.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
  const denied = /\b(?:not|never|does not|doesn't|is not|isn't|cannot|can't)\b/i.test(compact);
  const cleaned = compact.replace(/\b(?:not|never|does not|doesn't|is not|isn't|cannot|can't)\b/gi, " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(.+?)\s+(supports|connects|uses|contains|requires|governs|applies to|is|has|enables|provides|creates|references)\s+(.+)$/i);
  if (!match) return null;
  return { subject: match[1].trim(), predicate: match[2].trim().toLowerCase().replace(/\s+/g, "_"), object: match[3].trim(), polarity: denied ? "denied" : "affirmed" };
}

async function resolveEntity(client: PoolClient, nodeId: string, rawName: string) {
  const normalized = normalizeName(rawName); const kind = inferKind(rawName);
  const existing = await client.query(`SELECT * FROM entities WHERE node_id=$1 AND kind=$2 AND normalized_name=$3 LIMIT 1`, [nodeId, kind, normalized]);
  if (existing.rowCount === 1) return existing.rows[0];
  const id = uuidv7();
  await client.query(`INSERT INTO entities(id,node_id,kind,canonical_name,aliases,external_ids,normalized_name,resolution_confidence) VALUES ($1,$2,$3,$4,'{}'::text[],'{}'::jsonb,$5,0.82)`, [id,nodeId,kind,rawName.trim(),normalized]);
  return (await client.query(`SELECT * FROM entities WHERE id=$1`, [id])).rows[0];
}

async function ensureSemanticEdge(client: PoolClient, nodeId: string, sourceType: string, sourceId: string, predicate: string, targetType: string, targetId: string, principalId: string) {
  const found = await client.query(`SELECT id FROM relationships WHERE node_id=$1 AND source_type=$2 AND source_id=$3 AND predicate=$4 AND target_type=$5 AND target_id=$6 LIMIT 1`, [nodeId,sourceType,sourceId,predicate,targetType,targetId]);
  if (found.rowCount === 1) return found.rows[0].id as string;
  const id=uuidv7();
  await client.query(`INSERT INTO relationships(id,node_id,source_type,source_id,predicate,target_type,target_id,epistemic_status,confidence,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',0.85,$8)`, [id,nodeId,sourceType,sourceId,predicate,targetType,targetId,principalId]);
  return id;
}

export async function enrichContextSemantics(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp=await client.query(`SELECT node_id,principal_id FROM context_packages WHERE id=$1`,[contextPackageId]);
  if(ccp.rowCount!==1) throw Object.assign(new Error("CCP_NOT_FOUND"),{statusCode:404});
  if(ccp.rows[0].principal_id!==principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"),{statusCode:403});
  const evidence=await client.query(`SELECT ce.fragment_id,ce.cko_id,f.text_content FROM context_evidence ce JOIN fragments f ON f.id=ce.fragment_id WHERE ce.context_package_id=$1 ORDER BY ce.ordinal`,[contextPackageId]);
  const semanticClaims:any[]=[];
  for(const row of evidence.rows){
    const triple=simpleTriple(String(row.text_content??"")); if(!triple) continue;
    const subject=await resolveEntity(client,ccp.rows[0].node_id,triple.subject); const object=await resolveEntity(client,ccp.rows[0].node_id,triple.object);
    const fingerprint=sha256(`${subject.id}:${triple.predicate}:${object.id}:${triple.polarity}`);
    let claim=await client.query(`SELECT * FROM claims WHERE node_id=$1 AND fingerprint=$2`,[ccp.rows[0].node_id,fingerprint]);
    if(claim.rowCount!==1){
      const claimId=uuidv7(); const components={extractor:0.84,entity_resolution:0.82,evidence:0.9};
      await client.query(`INSERT INTO claims(id,node_id,subject_type,subject_id,predicate,object_kind,object_ref_type,object_ref_id,qualifiers,epistemic_status,confidence,created_by,fingerprint,semantic_subject_entity_id,semantic_object_entity_id,semantic_predicate,confidence_components) VALUES ($1,$2,'entity',$3,$4,'reference','entity',$5,$6::jsonb,'extracted',0.85,$7,$8,$3,$5,$4,$9::jsonb)`,[claimId,ccp.rows[0].node_id,subject.id,triple.predicate,object.id,JSON.stringify({polarity:triple.polarity,extractor:"semantic-spo-v0.1"}),principalId,fingerprint,JSON.stringify(components)]);
      claim=await client.query(`SELECT * FROM claims WHERE id=$1`,[claimId]);
    }
    const current=claim.rows[0];
    await client.query(`INSERT INTO claim_evidence(claim_id,fragment_id,evidence_role) VALUES ($1,$2,'source') ON CONFLICT DO NOTHING`,[current.id,row.fragment_id]);
    await client.query(`INSERT INTO context_claims(context_package_id,claim_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,[contextPackageId,current.id]);
    await client.query(`INSERT INTO semantic_extractions(id,node_id,context_package_id,fragment_id,claim_id,subject_entity_id,predicate,object_entity_id,extractor,confidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'semantic-spo-v0.1',$9) ON CONFLICT(context_package_id,fragment_id,claim_id) DO NOTHING`,[uuidv7(),ccp.rows[0].node_id,contextPackageId,row.fragment_id,current.id,subject.id,triple.predicate,object.id,current.confidence??0.85]);
    await ensureSemanticEdge(client,ccp.rows[0].node_id,"entity",subject.id,"SUBJECT_OF","claim",current.id,principalId);
    await ensureSemanticEdge(client,ccp.rows[0].node_id,"claim",current.id,"OBJECT","entity",object.id,principalId);
    semanticClaims.push({...current,subject_entity:subject,object_entity:object});
  }
  if(semanticClaims.length>0) await appendProvenanceEvent(client,{nodeId:ccp.rows[0].node_id,eventType:"semantic_claims_extracted",actorType:"service",actorPrincipalId:principalId,inputs:evidence.rows.map(r=>({resourceType:"fragment" as const,resourceId:r.fragment_id})),outputs:semanticClaims.map(c=>({resourceType:"claim" as const,resourceId:c.id})),parameters:{contextPackageId,extractor:"semantic-spo-v0.1",count:semanticClaims.length}});
  return semanticClaims;
}

export async function detectTemporalScopeConflicts(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp=await client.query(`SELECT node_id,principal_id FROM context_packages WHERE id=$1`,[contextPackageId]); if(ccp.rowCount!==1) throw Object.assign(new Error("CCP_NOT_FOUND"),{statusCode:404}); if(ccp.rows[0].principal_id!==principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"),{statusCode:403});
  const claims=await client.query(`SELECT c.* FROM context_claims cc JOIN claims c ON c.id=cc.claim_id WHERE cc.context_package_id=$1 AND c.semantic_subject_entity_id IS NOT NULL AND c.semantic_predicate IS NOT NULL`,[contextPackageId]); const conflicts:any[]=[];
  for(let i=0;i<claims.rows.length;i++) for(let j=i+1;j<claims.rows.length;j++){
    const a=claims.rows[i],b=claims.rows[j]; if(a.semantic_subject_entity_id!==b.semantic_subject_entity_id||a.semantic_predicate!==b.semantic_predicate) continue; if(a.semantic_object_entity_id&&a.semantic_object_entity_id===b.semantic_object_entity_id) continue;
    const overlap=!(a.valid_until&&b.valid_from&&new Date(a.valid_until)<new Date(b.valid_from))&&!(b.valid_until&&a.valid_from&&new Date(b.valid_until)<new Date(a.valid_from)); const type=overlap?"scope":"temporal";
    await client.query(`INSERT INTO claim_conflicts(id,node_id,claim_a_id,claim_b_id,conflict_type,confidence,details) VALUES ($1,$2,$3,$4,$5,0.82,$6::jsonb) ON CONFLICT DO NOTHING`,[uuidv7(),ccp.rows[0].node_id,a.id,b.id,type,JSON.stringify({semantic_predicate:a.semantic_predicate})]);
    const found=await client.query(`SELECT * FROM claim_conflicts WHERE node_id=$1 AND conflict_type=$2 AND ((claim_a_id=$3 AND claim_b_id=$4) OR (claim_a_id=$4 AND claim_b_id=$3)) LIMIT 1`,[ccp.rows[0].node_id,type,a.id,b.id]); if(found.rowCount===1) conflicts.push(found.rows[0]);
  }
  return conflicts;
}

export async function multiHopGraphReasoning(client: PoolClient, contextPackageId: string, principalId: string, maxDepth=2){
  const ccp=await client.query(`SELECT node_id,principal_id FROM context_packages WHERE id=$1`,[contextPackageId]); if(ccp.rowCount!==1) throw Object.assign(new Error("CCP_NOT_FOUND"),{statusCode:404}); if(ccp.rows[0].principal_id!==principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"),{statusCode:403});
  const seed=await client.query(`SELECT claim_id FROM context_claims WHERE context_package_id=$1`,[contextPackageId]); const visitedClaims=new Set<string>(seed.rows.map(r=>r.claim_id)); const visitedRelationships=new Set<string>(); let frontier=[...visitedClaims];
  for(let depth=0;depth<Math.max(1,Math.min(5,maxDepth))&&frontier.length;depth++){
    const semanticNeighbors=await client.query(`SELECT DISTINCT c2.id FROM claims c1 JOIN claims c2 ON c2.node_id=c1.node_id AND c2.id<>c1.id AND (c2.semantic_subject_entity_id=c1.semantic_subject_entity_id OR c2.semantic_subject_entity_id=c1.semantic_object_entity_id OR c2.semantic_object_entity_id=c1.semantic_subject_entity_id) WHERE c1.id=ANY($1::uuid[])`,[frontier]);
    const edges=await client.query(`SELECT * FROM relationships WHERE node_id=$1 AND ((source_type='claim' AND source_id=ANY($2::uuid[])) OR (target_type='claim' AND target_id=ANY($2::uuid[])))`,[ccp.rows[0].node_id,frontier]); const next:string[]=[];
    for(const row of semanticNeighbors.rows) if(!visitedClaims.has(row.id)){visitedClaims.add(row.id);next.push(row.id);}
    for(const edge of edges.rows){visitedRelationships.add(edge.id); for(const candidate of [[edge.source_type,edge.source_id],[edge.target_type,edge.target_id]] as const) if(candidate[0]==="claim"&&!visitedClaims.has(candidate[1])){visitedClaims.add(candidate[1]);next.push(candidate[1]);}}
    frontier=next;
  }
  const confidence=Math.max(0.35,Math.min(0.98,0.55+Math.min(visitedClaims.size,12)*0.02+Math.min(visitedRelationships.size,12)*0.01)); const runId=uuidv7();
  await client.query(`INSERT INTO graph_reasoning_runs(id,node_id,context_package_id,principal_id,max_depth,visited_claim_ids,visited_relationship_ids,confidence) VALUES ($1,$2,$3,$4,$5,$6::uuid[],$7::uuid[],$8)`,[runId,ccp.rows[0].node_id,contextPackageId,principalId,maxDepth,[...visitedClaims],[...visitedRelationships],confidence]);
  return {id:runId,max_depth:maxDepth,claim_ids:[...visitedClaims],relationship_ids:[...visitedRelationships],confidence};
}

export async function synthesizeContextConfidence(client: PoolClient, contextPackageId: string){
  const evidence=await client.query(`SELECT scores FROM context_evidence WHERE context_package_id=$1`,[contextPackageId]); const claims=await client.query(`SELECT c.confidence FROM context_claims cc JOIN claims c ON c.id=cc.claim_id WHERE cc.context_package_id=$1`,[contextPackageId]); const conflicts=await client.query(`SELECT COUNT(*)::int AS n FROM claim_conflicts WHERE claim_a_id IN (SELECT claim_id FROM context_claims WHERE context_package_id=$1) OR claim_b_id IN (SELECT claim_id FROM context_claims WHERE context_package_id=$1)`,[contextPackageId]);
  const ev=evidence.rows.map(r=>Number(r.scores?.final??0.5)),cl=claims.rows.map(r=>Number(r.confidence??0.5)); const evidenceScore=ev.length?ev.reduce((a,b)=>a+b,0)/ev.length:0.35; const claimScore=cl.length?cl.reduce((a,b)=>a+b,0)/cl.length:0.35; const conflictPenalty=Math.min(0.35,Number(conflicts.rows[0]?.n??0)*0.07); const final=Math.max(0,Math.min(1,evidenceScore*0.45+claimScore*0.45+0.10-conflictPenalty));
  return {final,evidence:evidenceScore,claims:claimScore,conflict_penalty:conflictPenalty,conflict_count:Number(conflicts.rows[0]?.n??0)};
}
