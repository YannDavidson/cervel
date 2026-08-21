import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { appendProvenanceEvent } from "./provenance";
import { executeContextReasoning } from "./reasoning";
import { enrichContextSemantics, detectTemporalScopeConflicts, multiHopGraphReasoning, synthesizeContextConfidence } from "./semantic";
import { uuidv7 } from "./uuidv7";
import { adapterFor, completeReceipt, prepareGateway,recordProviderHealth } from "./intelligence-gateway";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function runConfiguredAdapter(client: PoolClient, contextPackageId: string, principalId: string, answerId: string, contested: boolean) {
  const ccp = await client.query(`SELECT * FROM context_packages WHERE id=$1 AND principal_id=$2`, [contextPackageId, principalId]);
  if (ccp.rowCount !== 1) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"), { statusCode: 403 });
  const evidence = await client.query(
    `SELECT ce.citation, f.text_content FROM context_evidence ce JOIN fragments f ON f.id=ce.fragment_id
      WHERE ce.context_package_id=$1 ORDER BY ce.ordinal`, [contextPackageId]
  );
  const prepared=await prepareGateway(client,{nodeId:ccp.rows[0].node_id,workspaceId:ccp.rows[0].workspace_id,principalId,contextPackageId,query:ccp.rows[0].query,evidenceCount:evidence.rowCount??0,estimatedTokens:evidence.rows.reduce((n,row)=>n+Math.ceil(String(row.text_content??"").length/4),Math.ceil(String(ccp.rows[0].query).length/4)),evidenceSensitivityText:evidence.rows.map(row=>String(row.text_content??"")).join("\n").slice(0,100_000)}),chain=[prepared.plan.selected,...prepared.plan.fallbacks],started=Date.now();
  if(prepared.plan.mode==="retrieval_without_generation"||prepared.plan.selected.provider.id==="local:deterministic"){await completeReceipt(client,prepared.id,{answerId,provider:"local:deterministic",model:"cervel-trace-deterministic",status:"retrieval_only",latencyMs:Date.now()-started});return{failed:false as const,retrieval_only:true as const,receipt_id:prepared.id,route:prepared.plan};}
  let output:any=null,adapterId="",lastError="",chosenProvider="";for(const candidate of chain){const adapter=adapterFor(candidate.provider.id);if(!adapter)continue;adapterId=adapter.id;const attempt=Date.now();try{output=await adapter.execute({query:ccp.rows[0].query,contested,evidence:evidence.rows.map(row=>({text:String(row.text_content??""),citation:String(row.citation?.uri??"")}))});chosenProvider=candidate.provider.id;await recordProviderHealth(client,ccp.rows[0].node_id,candidate.provider.id,true,Date.now()-attempt);break;}catch(error){lastError=error instanceof Error?error.message:String(error);await recordProviderHealth(client,ccp.rows[0].node_id,candidate.provider.id,false,Date.now()-attempt,lastError);}}
  if(!output){const localFallback=chain.some(x=>x.provider.id==="local:deterministic");await completeReceipt(client,prepared.id,{answerId,provider:localFallback?"local:deterministic":prepared.plan.selected.provider.id,model:localFallback?"cervel-trace-deterministic":undefined,status:localFallback?"succeeded":"failed",latencyMs:Date.now()-started,error:lastError});return{failed:true as const,adapter:adapterId||prepared.plan.selected.provider.id,error:lastError||"INTELLIGENCE_PROVIDER_CHAIN_FAILED",receipt_id:prepared.id,route:prepared.plan};}

  const model = await client.query(
    `SELECT * FROM models WHERE node_id=$1 AND provider=$2 AND model_name=$3 AND purpose='reasoning' LIMIT 1`,
    [ccp.rows[0].node_id, output.provider, output.model]
  );
  let modelId: string;
  if (model.rowCount === 1) modelId = model.rows[0].id;
  else {
    modelId = uuidv7();
    await client.query(
      `INSERT INTO models(id,node_id,provider,model_name,model_version,purpose,metadata)
       VALUES ($1,$2,$3,$4,'external','reasoning',$5::jsonb)`,
      [modelId, ccp.rows[0].node_id, output.provider, output.model, JSON.stringify({ adapter: adapterId })]
    );
  }
  const modelRunId = uuidv7();
  const outputHash = sha256(output.text);
  await client.query(
    `INSERT INTO model_runs(id,node_id,model_id,principal_id,operation,parameters,input_hash,output_hash,started_at,completed_at,status)
     VALUES ($1,$2,$3,$4,'external_reason_over_context',$5::jsonb,$6,$7,now(),now(),'succeeded')`,
    [modelRunId, ccp.rows[0].node_id, modelId, principalId,
     JSON.stringify({ context_package_id: contextPackageId, adapter: adapterId, external_response_id: output.external_response_id ?? null }),
     sha256(JSON.stringify({ query: ccp.rows[0].query, contextPackageId })), outputHash]
  );
  await client.query(`UPDATE answers SET answer_text=$2, model_run_id=$3 WHERE id=$1`, [answerId, output.text, modelRunId]);
  const used=chain.find(x=>x.provider.id===chosenProvider),cost=used?.estimated_cost_usd??0;await completeReceipt(client,prepared.id,{answerId,provider:chosenProvider||output.provider,model:output.model,status:"succeeded",latencyMs:Date.now()-started,costUsd:cost});
  await appendProvenanceEvent(client, {
    nodeId: ccp.rows[0].node_id,
    eventType: "external_reasoning_applied",
    actorType: "model",
    actorPrincipalId: principalId,
    inputs: [{ resourceType: "context_package", resourceId: contextPackageId }],
    outputs: [{ resourceType: "response", resourceId: answerId, sha256: outputHash }],
    parameters: { adapter: adapterId, provider: output.provider, model: output.model, modelRunId, disclosure_receipt_id:prepared.id }
  });
  return { failed: false as const, model_run_id: modelRunId, provider: output.provider, model: output.model, text: output.text,receipt_id:prepared.id,route:prepared.plan };
}

export async function executeSemanticKnowledgeReasoning(client: PoolClient, contextPackageId: string, principalId: string) {
  const semanticClaims = await enrichContextSemantics(client, contextPackageId, principalId);
  const semanticConflicts = await detectTemporalScopeConflicts(client, contextPackageId, principalId);
  const graph = await multiHopGraphReasoning(client, contextPackageId, principalId, 3);
  const base = await executeContextReasoning(client, contextPackageId, principalId);
  const confidence = await synthesizeContextConfidence(client, contextPackageId);
  const contested = Boolean(base.uncertainty?.contested) || semanticConflicts.length > 0;
  const external = await runConfiguredAdapter(client, contextPackageId, principalId, base.id, contested);
  const successfulExternal = external && !external.failed && "text" in external ? external : null;

  await client.query(
    `UPDATE answers SET uncertainty = uncertainty || $2::jsonb, trace_summary = trace_summary || $3::jsonb WHERE id=$1`,
    [base.id,
     JSON.stringify({
       semantic_conflicts: semanticConflicts.length,
       confidence: confidence.final,
       contested,
       external_reasoning_failed: Boolean(external?.failed),
       external_reasoning_error: external?.failed ? external.error : null
     }),
     JSON.stringify({ semantic_claim_count: semanticClaims.length, graph_reasoning_run_id: graph.id, graph_confidence: graph.confidence })]
  );
  return {
    ...base,
    answer: successfulExternal?.text ?? base.answer,
    model_run_id: successfulExternal?.model_run_id ?? base.model_run_id,
    semantic: { claims: semanticClaims, conflicts: semanticConflicts, graph, confidence },
    adapter: successfulExternal
      ? { provider: successfulExternal.provider, model: successfulExternal.model }
      : { provider: "local", model: "cervel-trace-deterministic", fallback_from: external?.failed ? external.adapter : null },
    intelligence:{receipt_id:external?.receipt_id??null,route:external?.route??null},
    uncertainty: {
      ...base.uncertainty,
      contested,
      semantic_conflict_count: semanticConflicts.length,
      confidence: confidence.final,
      external_reasoning_failed: Boolean(external?.failed)
    }
  };
}
