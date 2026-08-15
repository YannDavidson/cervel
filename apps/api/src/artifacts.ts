import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { putArtifact } from "./storage";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";

export type RegisterArtifactInput = {
  nodeId: string;
  ckoId: string;
  storageLocationId: string;
  role?: "original" | "snapshot" | "extracted_text" | "thumbnail" | "translation" | "transcript" | "structured" | "derived";
  mimeType: string;
  filename: string;
  bytes: Buffer;
  actorPrincipalId?: string | null;
};

export async function registerArtifact(client: PoolClient, input: RegisterArtifactInput) {
  const artifactId = uuidv7();
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `objects/${input.ckoId}/${artifactId}/${safeName}`;

  await putArtifact(objectKey, input.bytes, input.mimeType);

  const row = await client.query(
    `INSERT INTO artifacts
      (id,node_id,cko_id,role,mime_type,storage_location_id,object_key,sha256,size_bytes,metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
     RETURNING *`,
    [
      artifactId,
      input.nodeId,
      input.ckoId,
      input.role ?? "original",
      input.mimeType,
      input.storageLocationId,
      objectKey,
      sha256,
      input.bytes.length,
      JSON.stringify({ filename: input.filename })
    ]
  );

  await client.query(
    `UPDATE knowledge_objects
     SET primary_artifact_id = COALESCE(primary_artifact_id, $1), updated_at = now()
     WHERE id = $2`,
    [artifactId, input.ckoId]
  );

  await appendProvenanceEvent(client, {
    nodeId: input.nodeId,
    eventType: "captured",
    actorType: input.actorPrincipalId ? "human" : "service",
    actorPrincipalId: input.actorPrincipalId ?? null,
    inputs: [{ resourceType: "cko", resourceId: input.ckoId }],
    outputs: [{ resourceType: "artifact", resourceId: artifactId, sha256 }],
    parameters: { mimeType: input.mimeType, filename: input.filename }
  });

  return row.rows[0];
}
