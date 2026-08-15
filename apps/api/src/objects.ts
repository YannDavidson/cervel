import type { PoolClient } from "pg";
import { canonicalCKURI } from "../../../packages/ckuri/src";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";

export type CreateKnowledgeObjectInput = {
  nodeId: string;
  workspaceId: string;
  type: string;
  title: string;
  summary?: string | null;
  languages?: string[];
  jurisdictions?: string[];
  createdBy?: string | null;
  nodeAuthority: string;
};

export async function createKnowledgeObject(client: PoolClient, input: CreateKnowledgeObjectInput) {
  const id = uuidv7();
  const versionId = uuidv7();

  const row = await client.query(
    `INSERT INTO knowledge_objects
      (id,node_id,workspace_id,type,title,summary,languages,jurisdictions,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      id,
      input.nodeId,
      input.workspaceId,
      input.type,
      input.title,
      input.summary ?? null,
      input.languages ?? [],
      input.jurisdictions ?? [],
      input.createdBy ?? null
    ]
  );

  const snapshot = row.rows[0];
  await client.query(
    `INSERT INTO cko_versions (id, cko_id, version, snapshot, changed_by, change_reason)
     VALUES ($1,$2,1,$3::jsonb,$4,'initial creation')`,
    [versionId, id, JSON.stringify(snapshot), input.createdBy ?? null]
  );

  await appendProvenanceEvent(client, {
    nodeId: input.nodeId,
    eventType: "created",
    actorType: input.createdBy ? "human" : "service",
    actorPrincipalId: input.createdBy ?? null,
    outputs: [{ resourceType: "cko", resourceId: id }]
  });

  return {
    ...snapshot,
    canonical_uri: canonicalCKURI(input.nodeAuthority, id)
  };
}
