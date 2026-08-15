import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { appendProvenanceEvent } from "./provenance";
import { uuidv7 } from "./uuidv7";

const TEXT_MIME = new Set([
  "text/plain",
  "text/markdown",
  "application/markdown",
  "application/json"
]);

export type IngestTextInput = {
  nodeId: string;
  ckoId: string;
  artifactId: string;
  mimeType: string;
  bytes: Buffer;
  actorPrincipalId?: string | null;
};

export async function ingestTextArtifact(client: PoolClient, input: IngestTextInput) {
  if (!TEXT_MIME.has(input.mimeType)) {
    return { ingested: false, reason: "UNSUPPORTED_MIME_TYPE", fragments: [] as string[] };
  }

  const text = input.bytes.toString("utf8").trim();
  if (!text) return { ingested: true, fragments: [] as string[] };

  // Alpha stable-fragment rule: paragraph boundaries are durable anchors.
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((value) => value.trim())
    .filter(Boolean);

  const fragmentIds: string[] = [];
  let cursor = 0;

  for (let ordinal = 0; ordinal < paragraphs.length; ordinal += 1) {
    const paragraph = paragraphs[ordinal];
    const start = text.indexOf(paragraph, cursor);
    const end = start + paragraph.length;
    cursor = end;

    const fragmentId = uuidv7();
    const contentSha256 = createHash("sha256").update(paragraph).digest("hex");

    await client.query(
      `INSERT INTO fragments
        (id,node_id,cko_id,artifact_id,type,ordinal,locator,text_content,char_start,char_end,content_sha256)
       VALUES ($1,$2,$3,$4,'paragraph',$5,$6::jsonb,$7,$8,$9,$10)`,
      [
        fragmentId,
        input.nodeId,
        input.ckoId,
        input.artifactId,
        ordinal,
        JSON.stringify({ paragraph: ordinal + 1 }),
        paragraph,
        start,
        end,
        contentSha256
      ]
    );

    fragmentIds.push(fragmentId);
  }

  await appendProvenanceEvent(client, {
    nodeId: input.nodeId,
    eventType: "extracted",
    actorType: "service",
    actorPrincipalId: input.actorPrincipalId ?? null,
    inputs: [{ resourceType: "artifact", resourceId: input.artifactId }],
    outputs: fragmentIds.map((id) => ({ resourceType: "fragment" as const, resourceId: id })),
    parameters: { strategy: "paragraph-v0.1", mimeType: input.mimeType }
  });

  return { ingested: true, fragments: fragmentIds };
}
