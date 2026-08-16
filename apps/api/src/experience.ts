import type { PoolClient } from "pg";
import { createKnowledgeObject } from "./objects";
import { registerArtifact } from "./artifacts";
import { ingestTextArtifact } from "./ingestion";
import { embedMissingFragments } from "./embeddings";
import { uuidv7 } from "./uuidv7";
import { canonicalCKURI } from "../../../packages/ckuri/src";

function scoped(session: Record<string, unknown>) {
  const nodeId = String(session.node_id);
  const principalId = String(session.principal_id);
  const workspaceId = session.workspace_id ? String(session.workspace_id) : null;
  if (!workspaceId) throw Object.assign(new Error("WORKSPACE_SESSION_SCOPE_REQUIRED"), { statusCode: 400 });
  return { nodeId, principalId, workspaceId };
}

function maxCaptureBytes(): number {
  const configured = Number(process.env.CERVEL_MAX_CAPTURE_BYTES ?? 5 * 1024 * 1024);
  if (!Number.isFinite(configured) || configured < 1024) return 5 * 1024 * 1024;
  return Math.min(configured, 100 * 1024 * 1024);
}

function validateCaptureInput(input: {
  sourceType: "upload" | "clip" | "note"; contentBase64?: string; contentText?: string; sourceUrl?: string;
}) {
  const max = maxCaptureBytes();
  if (input.sourceType === "upload" && !input.contentBase64) throw Object.assign(new Error("UPLOAD_CONTENT_REQUIRED"), { statusCode: 400 });
  if ((input.sourceType === "clip" || input.sourceType === "note") && !input.contentText?.trim()) {
    throw Object.assign(new Error("TEXT_CONTENT_REQUIRED"), { statusCode: 400 });
  }
  if (input.sourceType === "clip") {
    if (!input.sourceUrl) throw Object.assign(new Error("CLIP_SOURCE_URL_REQUIRED"), { statusCode: 400 });
    let parsed: URL;
    try { parsed = new URL(input.sourceUrl); }
    catch { throw Object.assign(new Error("CLIP_SOURCE_URL_INVALID"), { statusCode: 400 }); }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw Object.assign(new Error("CLIP_SOURCE_URL_INVALID"), { statusCode: 400 });
  }
  if (input.contentBase64 && input.contentBase64.length > Math.ceil(max * 4 / 3) + 16) {
    throw Object.assign(new Error("CAPTURE_TOO_LARGE"), { statusCode: 413 });
  }
  if (input.contentText && Buffer.byteLength(input.contentText, "utf8") > max) {
    throw Object.assign(new Error("CAPTURE_TOO_LARGE"), { statusCode: 413 });
  }
}

export async function captureKnowledge(client: PoolClient, session: Record<string, unknown>, input: {
  title: string; sourceType: "upload" | "clip" | "note"; type?: string; filename?: string;
  mimeType?: string; contentBase64?: string; contentText?: string; sourceUrl?: string; libraryIds?: string[];
}) {
  validateCaptureInput(input);
  const scope = scoped(session);
  const node = await client.query(`SELECT slug FROM nodes WHERE id=$1`, [scope.nodeId]);
  if (node.rowCount !== 1) throw Object.assign(new Error("NODE_NOT_FOUND"), { statusCode: 404 });
  const jobId = uuidv7();
  await client.query(
    `INSERT INTO capture_jobs(id,node_id,workspace_id,principal_id,source_type,status,filename,source_url,mime_type)
     VALUES ($1,$2,$3,$4,$5,'queued',$6,$7,$8)`,
    [jobId, scope.nodeId, scope.workspaceId, scope.principalId, input.sourceType, input.filename ?? null, input.sourceUrl ?? null, input.mimeType ?? null]
  );
  await client.query(`UPDATE capture_jobs SET status='processing',updated_at=now() WHERE id=$1`, [jobId]);
  await client.query(`SAVEPOINT cervel_capture_work`);
  try {
    const object = await createKnowledgeObject(client, {
      nodeId: scope.nodeId, workspaceId: scope.workspaceId, type: input.type ?? (input.sourceType === "note" ? "note" : "document"),
      title: input.title, summary: input.sourceType === "clip" ? input.sourceUrl ?? null : null,
      createdBy: scope.principalId, nodeAuthority: node.rows[0].slug
    });
    const libraryIds = [...new Set(input.libraryIds ?? [])];
    if (libraryIds.length) {
      const valid = await client.query(`SELECT id FROM libraries WHERE node_id=$1 AND workspace_id=$2 AND id=ANY($3::uuid[])`, [scope.nodeId, scope.workspaceId, libraryIds]);
      if (valid.rowCount !== libraryIds.length) throw Object.assign(new Error("LIBRARY_SCOPE_INVALID"), { statusCode: 403 });
      for (const libraryId of libraryIds) await client.query(`INSERT INTO library_memberships(library_id,cko_id,added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [libraryId, object.id, scope.principalId]);
    }
    const text = input.contentText ?? "";
    const bytes = input.contentBase64 ? Buffer.from(input.contentBase64, "base64") : Buffer.from(text, "utf8");
    if (bytes.length > maxCaptureBytes()) throw Object.assign(new Error("CAPTURE_TOO_LARGE"), { statusCode: 413 });
    if (bytes.length > 0) {
      const storage = await client.query(`SELECT id FROM storage_locations WHERE node_id=$1 ORDER BY is_primary DESC,created_at LIMIT 1`, [scope.nodeId]);
      if (storage.rowCount !== 1) throw Object.assign(new Error("STORAGE_LOCATION_REQUIRED"), { statusCode: 503 });
      const mimeType = input.mimeType ?? "text/markdown";
      const artifact = await registerArtifact(client, {
        nodeId: scope.nodeId, ckoId: object.id, storageLocationId: storage.rows[0].id,
        role: "original", mimeType, filename: input.filename ?? `${object.id}.md`, bytes, actorPrincipalId: scope.principalId
      });
      const ingestion = await ingestTextArtifact(client, { nodeId: scope.nodeId, ckoId: object.id, artifactId: artifact.id, mimeType, bytes, actorPrincipalId: scope.principalId });
      if (ingestion.ingested) await embedMissingFragments(client, scope.nodeId, object.id);
    }
    if (input.sourceType === "note") {
      await client.query(`INSERT INTO object_notes(id,cko_id,body,updated_by) VALUES ($1,$2,$3,$4) ON CONFLICT(cko_id) DO UPDATE SET body=EXCLUDED.body,version=object_notes.version+1,updated_by=EXCLUDED.updated_by,updated_at=now()`, [uuidv7(), object.id, text, scope.principalId]);
    }
    await client.query(`RELEASE SAVEPOINT cervel_capture_work`);
    await client.query(`UPDATE capture_jobs SET cko_id=$1,status='ready',updated_at=now(),completed_at=now() WHERE id=$2`, [object.id, jobId]);
    return { job_id: jobId, status: "ready" as const, object };
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT cervel_capture_work`);
    await client.query(`RELEASE SAVEPOINT cervel_capture_work`);
    const message = error instanceof Error ? error.message : String(error);
    await client.query(`UPDATE capture_jobs SET status='failed',error_message=$1,updated_at=now(),completed_at=now() WHERE id=$2`, [message, jobId]);
    return { job_id: jobId, status: "failed" as const, error: message };
  }
}

export async function listInbox(client: PoolClient, session: Record<string, unknown>, status?: string) {
  const scope = scoped(session);
  const allowedStatuses = new Set(["queued", "processing", "ready", "failed"]);
  if (status && !allowedStatuses.has(status)) throw Object.assign(new Error("INBOX_STATUS_INVALID"), { statusCode: 400 });
  const result = await client.query(
    `SELECT cj.*,ko.title,ko.type,n.slug AS node_authority
       FROM capture_jobs cj LEFT JOIN knowledge_objects ko ON ko.id=cj.cko_id JOIN nodes n ON n.id=cj.node_id
      WHERE cj.node_id=$1 AND cj.workspace_id=$2 AND ($3::text IS NULL OR cj.status=$3)
      ORDER BY cj.created_at DESC LIMIT 200`, [scope.nodeId, scope.workspaceId, status ?? null]
  );
  return result.rows.map(row => ({ ...row, canonical_uri: row.cko_id ? canonicalCKURI(row.node_authority, row.cko_id) : null }));
}

export async function createLibrary(client: PoolClient, session: Record<string, unknown>, input: { name: string; description?: string }) {
  const scope = scoped(session);
  const slugBase = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "library";
  const slug = `${slugBase}-${uuidv7().slice(0, 8)}`;
  const id = uuidv7();
  const row = await client.query(
    `INSERT INTO libraries(id,node_id,workspace_id,slug,name,description,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, scope.nodeId, scope.workspaceId, slug, input.name.trim(), input.description ?? null, scope.principalId]
  );
  return row.rows[0];
}

export async function updateLibrary(client: PoolClient, session: Record<string, unknown>, id: string, input: { name?: string; description?: string | null }) {
  const scope = scoped(session);
  const row = await client.query(
    `UPDATE libraries SET name=COALESCE($1,name),description=CASE WHEN $2::boolean THEN $3 ELSE description END
      WHERE id=$4 AND node_id=$5 AND workspace_id=$6 RETURNING *`,
    [input.name?.trim() || null, Object.prototype.hasOwnProperty.call(input, "description"), input.description ?? null, id, scope.nodeId, scope.workspaceId]
  );
  if (row.rowCount !== 1) throw Object.assign(new Error("LIBRARY_NOT_FOUND"), { statusCode: 404 });
  return row.rows[0];
}

export async function setLibraryMembership(client: PoolClient, session: Record<string, unknown>, libraryId: string, ckoId: string, present: boolean) {
  const scope = scoped(session);
  const valid = await client.query(`SELECT 1 FROM libraries l JOIN knowledge_objects ko ON ko.workspace_id=l.workspace_id WHERE l.id=$1 AND ko.id=$2 AND l.node_id=$3 AND l.workspace_id=$4 AND ko.node_id=$3`, [libraryId, ckoId, scope.nodeId, scope.workspaceId]);
  if (valid.rowCount !== 1) throw Object.assign(new Error("LIBRARY_OBJECT_SCOPE_INVALID"), { statusCode: 403 });
  if (present) await client.query(`INSERT INTO library_memberships(library_id,cko_id,added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [libraryId, ckoId, scope.principalId]);
  else await client.query(`DELETE FROM library_memberships WHERE library_id=$1 AND cko_id=$2`, [libraryId, ckoId]);
  return { library_id: libraryId, cko_id: ckoId, present };
}

export async function editObject(client: PoolClient, session: Record<string, unknown>, id: string, input: { title?: string; summary?: string | null; note?: string }) {
  const scope = scoped(session);
  const object = await client.query(`SELECT * FROM knowledge_objects WHERE id=$1 AND node_id=$2 AND workspace_id=$3 AND lifecycle_status<>'deleted'`, [id, scope.nodeId, scope.workspaceId]);
  if (object.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
  await client.query(
    `UPDATE knowledge_objects SET title=COALESCE($1,title),summary=CASE WHEN $2::boolean THEN $3 ELSE summary END,object_version=object_version+1,updated_at=now() WHERE id=$4`,
    [input.title?.trim() || null, Object.prototype.hasOwnProperty.call(input, "summary"), input.summary ?? null, id]
  );
  if (Object.prototype.hasOwnProperty.call(input, "note")) {
    if (Buffer.byteLength(input.note ?? "", "utf8") > maxCaptureBytes()) throw Object.assign(new Error("NOTE_TOO_LARGE"), { statusCode: 413 });
    await client.query(`INSERT INTO object_notes(id,cko_id,body,updated_by) VALUES ($1,$2,$3,$4) ON CONFLICT(cko_id) DO UPDATE SET body=EXCLUDED.body,version=object_notes.version+1,updated_by=EXCLUDED.updated_by,updated_at=now()`, [uuidv7(), id, input.note ?? "", scope.principalId]);
  }
  const updated = await client.query(`SELECT ko.*,onote.body AS note,onote.version AS note_version FROM knowledge_objects ko LEFT JOIN object_notes onote ON onote.cko_id=ko.id WHERE ko.id=$1`, [id]);
  await client.query(`INSERT INTO cko_versions(id,cko_id,version,snapshot,changed_by,change_reason) VALUES ($1,$2,$3,$4::jsonb,$5,'workspace edit')`, [uuidv7(), id, updated.rows[0].object_version, JSON.stringify(updated.rows[0]), scope.principalId]);
  return updated.rows[0];
}
