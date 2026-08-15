import type { PoolClient } from "pg";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";
import { hybridRetrieve, resolveRetrievalScope } from "./retrieval";

export async function assembleContextPackage(
  client: PoolClient,
  input: {
    nodeId: string;
    workspaceId?: string | null;
    principalId: string;
    query: string;
    taskType?: string;
    profile?: string;
    asOf?: string | null;
    libraryIds?: string[];
    maxEvidenceItems?: number;
  }
) {
  const scope = await resolveRetrievalScope(client, {
    nodeId: input.nodeId,
    principalId: input.principalId,
    workspaceId: input.workspaceId,
    requestedLibraryIds: input.libraryIds
  });

  const evidence = await hybridRetrieve(
    client,
    scope,
    input.query,
    input.maxEvidenceItems ?? 12
  );

  const id = uuidv7();
  await client.query(
    `INSERT INTO context_packages
      (id,node_id,workspace_id,principal_id,profile,query,task_type,request_context,authorization_scope,policy_snapshot_hash,uncertainty,budget)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12::jsonb)`,
    [
      id,
      input.nodeId,
      input.workspaceId ?? null,
      input.principalId,
      input.profile ?? "qa",
      input.query,
      input.taskType ?? "question_answering",
      JSON.stringify({ as_of: input.asOf ?? null, library_ids: input.libraryIds ?? [] }),
      JSON.stringify({ allowed_operations: scope.allowedOperations, library_ids: scope.libraryIds }),
      scope.policySnapshotHash,
      JSON.stringify({ unresolved: evidence.length === 0 ? ["no_retrievable_evidence"] : [] }),
      JSON.stringify({ max_evidence_items: input.maxEvidenceItems ?? 12 })
    ]
  );

  for (let ordinal = 0; ordinal < evidence.length; ordinal += 1) {
    const item = evidence[ordinal];
    await client.query(
      `INSERT INTO context_evidence
       (context_package_id,fragment_id,cko_id,evidence_role,scores,citation,ordinal)
       VALUES ($1,$2,$3,'primary',$4::jsonb,$5::jsonb,$6)`,
      [
        id,
        item.fragmentId,
        item.ckoId,
        JSON.stringify({ lexical: item.lexical, semantic: item.semantic, final: item.final }),
        JSON.stringify({ uri: item.citationUri, label: null }),
        ordinal
      ]
    );
  }

  const provenanceEventId = await appendProvenanceEvent(client, {
    nodeId: input.nodeId,
    eventType: "used_in_context",
    actorType: "service",
    actorPrincipalId: input.principalId,
    inputs: evidence.map((item) => ({ resourceType: "fragment" as const, resourceId: item.fragmentId })),
    outputs: [{ resourceType: "context_package", resourceId: id }],
    parameters: { query: input.query, profile: input.profile ?? "qa", evidenceCount: evidence.length }
  });

  return {
    ccp_version: "0.1",
    id,
    node_id: input.nodeId,
    workspace_id: input.workspaceId ?? null,
    profile: input.profile ?? "qa",
    request: {
      query: input.query,
      task_type: input.taskType ?? "question_answering",
      as_of: input.asOf ?? null
    },
    principal: { principal_id: input.principalId, principal_type: "human", acting_for: null },
    authorization_scope: {
      policy_snapshot_hash: scope.policySnapshotHash,
      allowed_operations: scope.allowedOperations,
      library_ids: scope.libraryIds
    },
    evidence: {
      primary: evidence.map((item) => ({
        fragment_id: item.fragmentId,
        cko_id: item.ckoId,
        scores: { lexical: item.lexical, semantic: item.semantic, final: item.final },
        epistemic_status: "raw",
        citation: { uri: item.citationUri, label: null }
      })),
      supporting: [],
      conflicting: []
    },
    uncertainty: { unresolved: evidence.length === 0 ? ["no_retrievable_evidence"] : [] },
    trace: { provenance_event_ids: [provenanceEventId] },
    created_at: new Date().toISOString()
  };
}
