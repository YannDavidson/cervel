import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeClaim(text: string): { normalized: string; polarity: "affirmed" | "denied" } {
  const compact = text.trim().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
  const denied = /\b(?:not|never|no longer|doesn't|does not|isn't|is not|aren't|are not|cannot|can't)\b/i.test(compact);
  const normalized = compact
    .toLowerCase()
    .replace(/\b(?:doesn't|does not|isn't|is not|aren't|are not|cannot|can't|never|not|no longer)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { normalized, polarity: denied ? "denied" : "affirmed" };
}

async function ensureClaim(
  client: PoolClient,
  input: { nodeId: string; principalId: string; ckoId: string; fragmentId: string; text: string }
) {
  const parsed = normalizeClaim(input.text);
  const fingerprint = sha256(`${input.ckoId}:${parsed.normalized}:${parsed.polarity}`);
  const existing = await client.query(`SELECT * FROM claims WHERE node_id = $1 AND fingerprint = $2`, [input.nodeId, fingerprint]);
  if (existing.rowCount === 1) {
    await client.query(
      `INSERT INTO claim_evidence(claim_id,fragment_id,evidence_role) VALUES ($1,$2,'source') ON CONFLICT DO NOTHING`,
      [existing.rows[0].id, input.fragmentId]
    );
    return existing.rows[0];
  }

  const id = uuidv7();
  await client.query(
    `INSERT INTO claims
      (id,node_id,subject_type,subject_id,predicate,object_kind,literal_value,literal_datatype,qualifiers,epistemic_status,confidence,created_by,fingerprint)
     VALUES ($1,$2,'cko',$3,'asserts','literal',$4::jsonb,'cervel:assertion',$5::jsonb,'extracted',$6,$7,$8)`,
    [
      id,
      input.nodeId,
      input.ckoId,
      JSON.stringify({ text: input.text.trim(), normalized: parsed.normalized, polarity: parsed.polarity }),
      JSON.stringify({ extractor: "deterministic-claim-v0.1", polarity: parsed.polarity }),
      0.8,
      input.principalId,
      fingerprint
    ]
  );
  await client.query(
    `INSERT INTO claim_evidence(claim_id,fragment_id,evidence_role) VALUES ($1,$2,'source') ON CONFLICT DO NOTHING`,
    [id, input.fragmentId]
  );
  return (await client.query(`SELECT * FROM claims WHERE id = $1`, [id])).rows[0];
}

export async function extractContextClaims(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp = await client.query(`SELECT node_id, principal_id FROM context_packages WHERE id = $1`, [contextPackageId]);
  if (ccp.rowCount !== 1) throw Object.assign(new Error("CCP_NOT_FOUND"), { statusCode: 404 });
  if (ccp.rows[0].principal_id !== principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"), { statusCode: 403 });

  const evidence = await client.query(
    `SELECT ce.fragment_id, ce.cko_id, f.text_content
       FROM context_evidence ce
       JOIN fragments f ON f.id = ce.fragment_id
      WHERE ce.context_package_id = $1
      ORDER BY ce.ordinal`,
    [contextPackageId]
  );

  const claims = [] as any[];
  for (const row of evidence.rows) {
    if (!row.text_content || !String(row.text_content).trim()) continue;
    const claim = await ensureClaim(client, {
      nodeId: ccp.rows[0].node_id,
      principalId,
      ckoId: row.cko_id,
      fragmentId: row.fragment_id,
      text: row.text_content
    });
    claims.push(claim);
    await client.query(
      `INSERT INTO context_claims(context_package_id,claim_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [contextPackageId, claim.id]
    );
  }

  await appendProvenanceEvent(client, {
    nodeId: ccp.rows[0].node_id,
    eventType: "claims_extracted",
    actorType: "service",
    actorPrincipalId: principalId,
    inputs: evidence.rows.map((row) => ({ resourceType: "fragment" as const, resourceId: row.fragment_id })),
    outputs: claims.map((claim) => ({ resourceType: "claim" as const, resourceId: claim.id })),
    parameters: { contextPackageId, claimCount: claims.length, extractor: "deterministic-claim-v0.1" }
  });

  return claims;
}

export async function detectContextConflicts(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp = await client.query(`SELECT node_id, principal_id FROM context_packages WHERE id = $1`, [contextPackageId]);
  if (ccp.rowCount !== 1) throw Object.assign(new Error("CCP_NOT_FOUND"), { statusCode: 404 });
  if (ccp.rows[0].principal_id !== principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"), { statusCode: 403 });

  const claims = await client.query(
    `SELECT c.* FROM context_claims cc JOIN claims c ON c.id = cc.claim_id WHERE cc.context_package_id = $1 ORDER BY c.created_at`,
    [contextPackageId]
  );
  const conflicts: any[] = [];
  for (let i = 0; i < claims.rows.length; i += 1) {
    for (let j = i + 1; j < claims.rows.length; j += 1) {
      const a = claims.rows[i];
      const b = claims.rows[j];
      const av = a.literal_value ?? {};
      const bv = b.literal_value ?? {};
      if (!av.normalized || av.normalized !== bv.normalized || av.polarity === bv.polarity) continue;
      const id = uuidv7();
      const inserted = await client.query(
        `INSERT INTO claim_conflicts(id,node_id,claim_a_id,claim_b_id,conflict_type,confidence,details)
         VALUES ($1,$2,$3,$4,'polarity',$5,$6::jsonb)
         ON CONFLICT DO NOTHING RETURNING *`,
        [id, ccp.rows[0].node_id, a.id, b.id, 0.95, JSON.stringify({ normalized: av.normalized })]
      );
      const row = inserted.rowCount === 1
        ? inserted.rows[0]
        : (await client.query(
            `SELECT * FROM claim_conflicts WHERE node_id=$1 AND conflict_type='polarity' AND ((claim_a_id=$2 AND claim_b_id=$3) OR (claim_a_id=$3 AND claim_b_id=$2))`,
            [ccp.rows[0].node_id, a.id, b.id]
          )).rows[0];
      if (row) conflicts.push(row);
    }
  }
  return conflicts;
}

export async function expandContextGraph(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp = await client.query(`SELECT node_id, principal_id FROM context_packages WHERE id=$1`, [contextPackageId]);
  if (ccp.rowCount !== 1) throw Object.assign(new Error("CCP_NOT_FOUND"), { statusCode: 404 });
  if (ccp.rows[0].principal_id !== principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"), { statusCode: 403 });
  const claims = await client.query(`SELECT claim_id FROM context_claims WHERE context_package_id=$1`, [contextPackageId]);
  const ids = claims.rows.map((row) => row.claim_id as string);
  if (ids.length === 0) return { claims: [], relationships: [], neighboring_claims: [] };

  const relationships = await client.query(
    `SELECT * FROM relationships WHERE node_id=$1 AND ((source_type='claim' AND source_id = ANY($2::uuid[])) OR (target_type='claim' AND target_id = ANY($2::uuid[])))`,
    [ccp.rows[0].node_id, ids]
  );
  const neighboring = await client.query(
    `SELECT DISTINCT c.* FROM claims c
      WHERE c.node_id=$1 AND c.id <> ALL($2::uuid[]) AND EXISTS (
        SELECT 1 FROM claims base WHERE base.id = ANY($2::uuid[]) AND base.subject_type=c.subject_type AND base.subject_id=c.subject_id AND base.predicate=c.predicate
      )
      ORDER BY c.created_at DESC LIMIT 24`,
    [ccp.rows[0].node_id, ids]
  );
  return { claims: ids, relationships: relationships.rows, neighboring_claims: neighboring.rows };
}

async function ensureReasoningModel(client: PoolClient, nodeId: string) {
  const found = await client.query(
    `SELECT * FROM models WHERE node_id=$1 AND provider='local' AND model_name='cervel-trace-deterministic' AND purpose='reasoning' ORDER BY created_at LIMIT 1`,
    [nodeId]
  );
  if (found.rowCount === 1) return found.rows[0];
  const id = uuidv7();
  await client.query(
    `INSERT INTO models(id,node_id,provider,model_name,model_version,purpose,metadata) VALUES ($1,$2,'local','cervel-trace-deterministic','0.1','reasoning',$3::jsonb)`,
    [id, nodeId, JSON.stringify({ deterministic: true, cited: true })]
  );
  return (await client.query(`SELECT * FROM models WHERE id=$1`, [id])).rows[0];
}

export async function executeContextReasoning(client: PoolClient, contextPackageId: string, principalId: string) {
  const ccp = await client.query(`SELECT * FROM context_packages WHERE id=$1`, [contextPackageId]);
  if (ccp.rowCount !== 1) throw Object.assign(new Error("CCP_NOT_FOUND"), { statusCode: 404 });
  if (ccp.rows[0].principal_id !== principalId) throw Object.assign(new Error("FORBIDDEN_CONTEXT_SCOPE"), { statusCode: 403 });

  const claims = await extractContextClaims(client, contextPackageId, principalId);
  const conflicts = await detectContextConflicts(client, contextPackageId, principalId);
  const graph = await expandContextGraph(client, contextPackageId, principalId);
  const model = await ensureReasoningModel(client, ccp.rows[0].node_id);
  const modelRunId = uuidv7();
  const inputHash = sha256(JSON.stringify({ contextPackageId, query: ccp.rows[0].query, claims: claims.map((c) => c.id) }));
  await client.query(
    `INSERT INTO model_runs(id,node_id,model_id,principal_id,operation,parameters,input_hash,started_at,status)
     VALUES ($1,$2,$3,$4,'reason_over_context',$5::jsonb,$6,now(),'running')`,
    [modelRunId, ccp.rows[0].node_id, model.id, principalId, JSON.stringify({ context_package_id: contextPackageId }), inputHash]
  );

  const evidence = await client.query(
    `SELECT ce.ordinal, ce.citation, f.text_content, f.id AS fragment_id, ce.cko_id
       FROM context_evidence ce JOIN fragments f ON f.id=ce.fragment_id
      WHERE ce.context_package_id=$1 ORDER BY ce.ordinal`,
    [contextPackageId]
  );
  const citations = evidence.rows.map((row, index) => ({
    index: index + 1,
    uri: row.citation?.uri,
    fragment_id: row.fragment_id,
    cko_id: row.cko_id
  }));
  const sentences = evidence.rows.slice(0, 4).map((row, index) => `${String(row.text_content ?? "").trim()} [${index + 1}]`).filter(Boolean);
  const conflictNote = conflicts.length > 0 ? ` Conflicting evidence detected across ${conflicts.length} claim pair${conflicts.length === 1 ? "" : "s"}; treat the answer as contested.` : "";
  const answerText = sentences.length > 0
    ? `${sentences.join(" ")}${conflictNote}`
    : "No authorized evidence was available to answer this request.";
  const outputHash = sha256(answerText);
  await client.query(`UPDATE model_runs SET output_hash=$2,completed_at=now(),status='succeeded' WHERE id=$1`, [modelRunId, outputHash]);

  const answerId = uuidv7();
  await client.query(
    `INSERT INTO answers(id,node_id,workspace_id,principal_id,context_package_id,model_run_id,answer_text,citations,uncertainty,trace_summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb)`,
    [
      answerId,
      ccp.rows[0].node_id,
      ccp.rows[0].workspace_id,
      principalId,
      contextPackageId,
      modelRunId,
      answerText,
      JSON.stringify(citations),
      JSON.stringify({ contested: conflicts.length > 0, conflict_count: conflicts.length }),
      JSON.stringify({ claim_count: claims.length, graph_relationship_count: graph.relationships.length, neighboring_claim_count: graph.neighboring_claims.length })
    ]
  );
  for (let i = 0; i < claims.length; i += 1) {
    await client.query(`INSERT INTO answer_claims(answer_id,claim_id,role,ordinal) VALUES ($1,$2,'supporting',$3) ON CONFLICT DO NOTHING`, [answerId, claims[i].id, i]);
  }
  const conflictIds = new Set(conflicts.flatMap((c) => [c.claim_a_id, c.claim_b_id]));
  let ordinal = 0;
  for (const claimId of conflictIds) {
    await client.query(`INSERT INTO answer_claims(answer_id,claim_id,role,ordinal) VALUES ($1,$2,'conflicting',$3) ON CONFLICT DO NOTHING`, [answerId, claimId, ordinal++]);
  }

  const provenanceEventId = await appendProvenanceEvent(client, {
    nodeId: ccp.rows[0].node_id,
    eventType: "reasoned_answer_generated",
    actorType: "model",
    actorPrincipalId: principalId,
    inputs: [
      { resourceType: "context_package", resourceId: contextPackageId },
      ...claims.map((claim) => ({ resourceType: "claim" as const, resourceId: claim.id }))
    ],
    outputs: [{ resourceType: "response", resourceId: answerId, sha256: outputHash }],
    parameters: { modelRunId, model: model.model_name, conflicts: conflicts.length }
  });

  return {
    id: answerId,
    context_package_id: contextPackageId,
    model_run_id: modelRunId,
    answer: answerText,
    citations,
    claims: claims.map((claim) => ({ id: claim.id, literal_value: claim.literal_value, confidence: claim.confidence })),
    conflicts,
    graph,
    uncertainty: { contested: conflicts.length > 0, conflict_count: conflicts.length },
    trace: { provenance_event_ids: [provenanceEventId] }
  };
}

export async function loadAnswerTrace(client: PoolClient, answerId: string, principalId: string) {
  const answer = await client.query(`SELECT * FROM answers WHERE id=$1`, [answerId]);
  if (answer.rowCount !== 1) throw Object.assign(new Error("ANSWER_NOT_FOUND"), { statusCode: 404 });
  if (answer.rows[0].principal_id !== principalId) throw Object.assign(new Error("FORBIDDEN_ANSWER_SCOPE"), { statusCode: 403 });

  const rows = await client.query(
    `SELECT ac.role AS answer_claim_role, ac.ordinal AS answer_claim_ordinal,
            c.id AS claim_id, c.predicate, c.literal_value, c.confidence AS claim_confidence,
            ce.evidence_role AS claim_evidence_role,
            f.id AS fragment_id, f.text_content, f.locator,
            a.id AS artifact_id, a.role AS artifact_role, a.mime_type, a.object_key, a.sha256 AS artifact_sha256, a.metadata AS artifact_metadata,
            ko.id AS cko_id, ko.title AS source_title
       FROM answer_claims ac
       JOIN claims c ON c.id=ac.claim_id
       LEFT JOIN claim_evidence ce ON ce.claim_id=c.id
       LEFT JOIN fragments f ON f.id=ce.fragment_id
       LEFT JOIN artifacts a ON a.id=f.artifact_id
       LEFT JOIN knowledge_objects ko ON ko.id=f.cko_id
      WHERE ac.answer_id=$1
      ORDER BY ac.role, ac.ordinal, f.ordinal`,
    [answerId]
  );
  const conflicts = await client.query(
    `SELECT cc.* FROM claim_conflicts cc
      WHERE cc.claim_a_id IN (SELECT claim_id FROM answer_claims WHERE answer_id=$1)
         OR cc.claim_b_id IN (SELECT claim_id FROM answer_claims WHERE answer_id=$1)
      ORDER BY cc.created_at`,
    [answerId]
  );
  return {
    trace_version: "0.1",
    answer: {
      id: answer.rows[0].id,
      text: answer.rows[0].answer_text,
      citations: answer.rows[0].citations,
      model_run_id: answer.rows[0].model_run_id
    },
    context_package: { id: answer.rows[0].context_package_id },
    chain: rows.rows.map((row) => ({
      answer_id: answerId,
      context_package_id: answer.rows[0].context_package_id,
      claim: { id: row.claim_id, role: row.answer_claim_role, predicate: row.predicate, value: row.literal_value, confidence: row.claim_confidence },
      evidence: { role: row.claim_evidence_role },
      fragment: { id: row.fragment_id, text: row.text_content, locator: row.locator },
      artifact: { id: row.artifact_id, role: row.artifact_role, mime_type: row.mime_type, object_key: row.object_key, sha256: row.artifact_sha256, metadata: row.artifact_metadata },
      source: { cko_id: row.cko_id, title: row.source_title }
    })),
    conflicts: conflicts.rows
  };
}
