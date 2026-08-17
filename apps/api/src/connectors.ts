import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { createKnowledgeObject } from "./objects";
import { registerArtifact } from "./artifacts";
import { ingestTextArtifact } from "./ingestion";
import { embedMissingFragments } from "./embeddings";
import { connectorIdentity } from "./connector-oauth";
import { uuidv7 } from "./uuidv7";

export type Provider = "google_drive" | "dropbox" | "onedrive";
type Session = Record<string, unknown>;
const MAX_SOURCE_BYTES = Number(process.env.CERVEL_CONNECTOR_MAX_BYTES ?? 25 * 1024 * 1024);

function scope(session: Session) {
  const nodeId = String(session.node_id);
  const principalId = String(session.principal_id);
  const workspaceId = session.workspace_id ? String(session.workspace_id) : "";
  if (!workspaceId) throw Object.assign(new Error("WORKSPACE_SESSION_SCOPE_REQUIRED"), { statusCode: 400 });
  return { nodeId, principalId, workspaceId };
}

function key() {
  const raw = process.env.CERVEL_CONNECTOR_TOKEN_KEY;
  if (!raw) throw Object.assign(new Error("CERVEL_CONNECTOR_TOKEN_KEY_REQUIRED"), { statusCode: 503 });
  return createHash("sha256").update(raw).digest();
}

function seal(value?: string | null) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function open(value?: string | null) {
  if (!value) return null;
  const data = Buffer.from(value, "base64url");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const body = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

const cfg = {
  google_drive: {
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email https://www.googleapis.com/auth/drive.readonly"
  },
  dropbox: {
    auth: "https://www.dropbox.com/oauth2/authorize",
    token: "https://api.dropboxapi.com/oauth2/token",
    scope: "account_info.read files.metadata.read files.content.read"
  },
  onedrive: {
    auth: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email offline_access Files.Read.All"
  }
} as const;

function env(provider: Provider, name: string) {
  const prefix = provider === "google_drive" ? "GOOGLE_DRIVE" : provider === "dropbox" ? "DROPBOX" : "ONEDRIVE";
  const value = process.env[`CERVEL_${prefix}_${name}`];
  if (!value) throw Object.assign(new Error(`CERVEL_${prefix}_${name}_REQUIRED`), { statusCode: 503 });
  return value;
}

export async function connectorStart(client: PoolClient, session: Session, provider: Provider) {
  const s = scope(session);
  const state = randomBytes(24).toString("base64url");
  await client.query(
    `INSERT INTO auth_challenges(id,node_id,principal_id,workspace_id,kind,state,payload,expires_at)
     VALUES($1,$2,$3,$4,'source_connector',$5,$6::jsonb,now()+interval '10 minutes')`,
    [uuidv7(), s.nodeId, s.principalId, s.workspaceId, state, JSON.stringify({ provider })]
  );
  const config = cfg[provider];
  const url = new URL(config.auth);
  url.searchParams.set("client_id", env(provider, "CLIENT_ID"));
  url.searchParams.set("redirect_uri", env(provider, "REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scope);
  if (provider === "google_drive") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  if (provider === "dropbox") url.searchParams.set("token_access_type", "offline");
  return { authorization_url: url.toString() };
}

export async function connectorCallback(client: PoolClient, provider: Provider, code: string, state: string) {
  const challenge = await client.query(
    `UPDATE auth_challenges SET consumed_at=now()
     WHERE kind='source_connector' AND state=$1 AND consumed_at IS NULL AND expires_at>now()
       AND payload->>'provider'=$2 RETURNING *`,
    [state, provider]
  );
  if (challenge.rowCount !== 1) throw Object.assign(new Error("CONNECTOR_STATE_INVALID"), { statusCode: 401 });

  const config = cfg[provider];
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env(provider, "CLIENT_ID"),
    client_secret: env(provider, "CLIENT_SECRET"),
    redirect_uri: env(provider, "REDIRECT_URI")
  });
  const response = await fetch(config.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!response.ok) throw Object.assign(new Error("CONNECTOR_TOKEN_EXCHANGE_FAILED"), { statusCode: 401 });
  const token = await response.json() as any;
  if (!token.access_token) throw Object.assign(new Error("CONNECTOR_ACCESS_TOKEN_MISSING"), { statusCode: 401 });

  const identity = await connectorIdentity(provider, token, token.access_token);
  const row = await client.query(
    `INSERT INTO source_connections(
       id,node_id,workspace_id,principal_id,provider,account_subject,account_email,
       access_token_ciphertext,refresh_token_ciphertext,token_expires_at,provider_state)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     ON CONFLICT(node_id,workspace_id,provider,account_subject) DO UPDATE SET
       account_email=EXCLUDED.account_email,
       access_token_ciphertext=EXCLUDED.access_token_ciphertext,
       refresh_token_ciphertext=COALESCE(EXCLUDED.refresh_token_ciphertext,source_connections.refresh_token_ciphertext),
       token_expires_at=EXCLUDED.token_expires_at,status='connected',last_error=NULL,updated_at=now()
     RETURNING id,provider,status,account_email`,
    [
      uuidv7(), challenge.rows[0].node_id, challenge.rows[0].workspace_id, challenge.rows[0].principal_id,
      provider, identity.subject, identity.email, seal(token.access_token), seal(token.refresh_token),
      token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null,
      JSON.stringify({ token_type: token.token_type ?? null })
    ]
  );
  return row.rows[0];
}

export async function addWatch(client: PoolClient, session: Session, input: {
  connectionId: string; remoteId: string; name: string; remoteKind?: string; mimeType?: string;
  libraryId?: string | null; intervalMinutes?: number;
}) {
  const s = scope(session);
  const connection = await client.query(
    `SELECT id FROM source_connections WHERE id=$1 AND node_id=$2 AND workspace_id=$3 AND status<>'disconnected'`,
    [input.connectionId, s.nodeId, s.workspaceId]
  );
  if (connection.rowCount !== 1) throw Object.assign(new Error("SOURCE_CONNECTION_NOT_FOUND"), { statusCode: 404 });
  if (input.libraryId) {
    const library = await client.query(`SELECT 1 FROM libraries WHERE id=$1 AND node_id=$2 AND workspace_id=$3`, [input.libraryId, s.nodeId, s.workspaceId]);
    if (library.rowCount !== 1) throw Object.assign(new Error("LIBRARY_SCOPE_INVALID"), { statusCode: 403 });
  }
  const row = await client.query(
    `INSERT INTO watched_sources(
       id,connection_id,node_id,workspace_id,principal_id,library_id,remote_id,remote_kind,name,mime_type,sync_interval_minutes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT(connection_id,remote_id) DO UPDATE SET
       name=EXCLUDED.name,library_id=EXCLUDED.library_id,sync_enabled=true,status='pending',next_sync_at=now(),updated_at=now()
     RETURNING *`,
    [uuidv7(), input.connectionId, s.nodeId, s.workspaceId, s.principalId, input.libraryId ?? null, input.remoteId,
      input.remoteKind ?? "file", input.name, input.mimeType ?? null, input.intervalMinutes ?? 60]
  );
  return row.rows[0];
}

async function tokenFor(client: PoolClient, watch: any) {
  let access = open(watch.access_token_ciphertext);
  if (watch.token_expires_at && new Date(watch.token_expires_at).getTime() < Date.now() + 60_000) {
    const refresh = open(watch.refresh_token_ciphertext);
    if (!refresh) throw new Error("CONNECTOR_REAUTH_REQUIRED");
    const provider = watch.provider as Provider;
    const config = cfg[provider];
    const form = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: env(provider, "CLIENT_ID"),
      client_secret: env(provider, "CLIENT_SECRET")
    });
    const response = await fetch(config.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
    if (!response.ok) throw new Error("CONNECTOR_REAUTH_REQUIRED");
    const token = await response.json() as any;
    access = token.access_token;
    await client.query(
      `UPDATE source_connections SET access_token_ciphertext=$1,
       refresh_token_ciphertext=COALESCE($2,refresh_token_ciphertext),token_expires_at=$3,updated_at=now() WHERE id=$4`,
      [seal(access), seal(token.refresh_token), token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null, watch.connection_id]
    );
  }
  if (!access) throw new Error("CONNECTOR_REAUTH_REQUIRED");
  return access;
}

async function remoteFile(provider: Provider, remoteId: string, access: string) {
  let meta: any;
  let bytes: Buffer;
  let mime = "application/octet-stream";
  let name = remoteId;
  let version: string | undefined;
  let modified: string | undefined;

  if (provider === "google_drive") {
    const metadata = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}?fields=id,name,mimeType,modifiedTime,md5Checksum,version`, { headers: { authorization: `Bearer ${access}` } });
    if (!metadata.ok) throw new Error("SOURCE_METADATA_FAILED");
    meta = await metadata.json();
    name = meta.name;
    mime = meta.mimeType;
    modified = meta.modifiedTime;
    version = String(meta.version ?? meta.md5Checksum ?? "");
    let url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}?alt=media`;
    if (String(mime).startsWith("application/vnd.google-apps.")) {
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(remoteId)}/export?mimeType=text/plain`;
      mime = "text/plain";
    }
    const response = await fetch(url, { headers: { authorization: `Bearer ${access}` } });
    if (!response.ok) throw new Error("SOURCE_DOWNLOAD_FAILED");
    bytes = Buffer.from(await response.arrayBuffer());
  } else if (provider === "dropbox") {
    const response = await fetch("https://content.dropboxapi.com/2/files/download", {
      headers: { authorization: `Bearer ${access}`, "Dropbox-API-Arg": JSON.stringify({ path: remoteId }) }
    });
    if (!response.ok) throw new Error("SOURCE_DOWNLOAD_FAILED");
    meta = JSON.parse(response.headers.get("dropbox-api-result") ?? "{}");
    name = meta.name ?? remoteId;
    version = meta.rev;
    modified = meta.server_modified;
    bytes = Buffer.from(await response.arrayBuffer());
    mime = "text/plain";
  } else {
    const metadata = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(remoteId)}`, { headers: { authorization: `Bearer ${access}` } });
    if (!metadata.ok) throw new Error("SOURCE_METADATA_FAILED");
    meta = await metadata.json();
    name = meta.name;
    mime = meta.file?.mimeType ?? "application/octet-stream";
    version = meta.eTag ?? meta.cTag;
    modified = meta.lastModifiedDateTime;
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(remoteId)}/content`, { headers: { authorization: `Bearer ${access}` } });
    if (!response.ok) throw new Error("SOURCE_DOWNLOAD_FAILED");
    bytes = Buffer.from(await response.arrayBuffer());
  }

  if (bytes.length > MAX_SOURCE_BYTES) throw new Error("SOURCE_TOO_LARGE");
  return { bytes, name, mime, version, modified };
}

async function health(client: PoolClient, watch: any, kind: string, severity: string, title: string, message: string) {
  await client.query(
    `INSERT INTO knowledge_health_notifications(id,node_id,workspace_id,watched_source_id,kind,severity,title,message,dedupe_key)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(workspace_id,dedupe_key) DO UPDATE SET
       severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,
       resolved_at=NULL,read_at=NULL,created_at=now()`,
    [uuidv7(), watch.node_id, watch.workspace_id, watch.id, kind, severity, title, message, `${kind}:${watch.id}`]
  );
}

async function resolveHealth(client: PoolClient, watch: any) {
  const resolved = await client.query(
    `UPDATE knowledge_health_notifications SET resolved_at=now()
     WHERE watched_source_id=$1 AND resolved_at IS NULL AND kind IN ('source_stale','sync_failed','reauth_required') RETURNING id`,
    [watch.id]
  );
  if ((resolved.rowCount ?? 0) > 0) {
    await health(client, watch, "source_recovered", "info", "Knowledge source recovered", `${watch.name} is syncing successfully again.`);
  }
}

export async function syncWatch(client: PoolClient, id: string) {
  const query = await client.query(
    `SELECT ws.*,sc.provider,sc.access_token_ciphertext,sc.refresh_token_ciphertext,sc.token_expires_at
     FROM watched_sources ws JOIN source_connections sc ON sc.id=ws.connection_id
     WHERE ws.id=$1 FOR UPDATE OF ws`,
    [id]
  );
  if (query.rowCount !== 1) throw Object.assign(new Error("WATCHED_SOURCE_NOT_FOUND"), { statusCode: 404 });
  const watch = query.rows[0];
  const runId = uuidv7();
  await client.query(`INSERT INTO source_sync_runs(id,watched_source_id,status) VALUES($1,$2,'running')`, [runId, watch.id]);
  await client.query(`UPDATE watched_sources SET status='syncing',last_checked_at=now(),updated_at=now() WHERE id=$1`, [watch.id]);

  try {
    const remote = await remoteFile(watch.provider, watch.remote_id, await tokenFor(client, watch));
    const sha = createHash("sha256").update(remote.bytes).digest("hex");
    const existing = await client.query(`SELECT * FROM source_documents WHERE watched_source_id=$1 AND remote_id=$2`, [watch.id, watch.remote_id]);

    if (existing.rowCount === 1 && existing.rows[0].content_sha256 === sha) {
      await client.query(
        `UPDATE watched_sources SET status='fresh',last_success_at=now(),last_remote_modified_at=$2,last_remote_version=$3,
         next_sync_at=now()+make_interval(mins=>$4),error_message=NULL,updated_at=now() WHERE id=$1`,
        [watch.id, remote.modified ?? null, remote.version ?? null, watch.sync_interval_minutes]
      );
      await client.query(`UPDATE source_sync_runs SET status='unchanged',content_sha256=$2,completed_at=now() WHERE id=$1`, [runId, sha]);
      await client.query(`UPDATE source_connections SET status='connected',last_error=NULL,updated_at=now() WHERE id=$1`, [watch.connection_id]);
      await resolveHealth(client, watch);
      return { status: "unchanged", cko_id: existing.rows[0].cko_id };
    }

    const node = await client.query(`SELECT slug FROM nodes WHERE id=$1`, [watch.node_id]);
    const storage = await client.query(`SELECT id FROM storage_locations WHERE node_id=$1 ORDER BY is_primary DESC,created_at LIMIT 1`, [watch.node_id]);
    if (storage.rowCount !== 1) throw new Error("STORAGE_LOCATION_REQUIRED");

    let ckoId: string;
    if (existing.rowCount === 0) {
      ckoId = (await createKnowledgeObject(client, {
        nodeId: watch.node_id, workspaceId: watch.workspace_id, type: "document", title: remote.name,
        summary: `Synced from ${watch.provider}`, createdBy: watch.principal_id, nodeAuthority: node.rows[0].slug
      })).id;
    } else {
      ckoId = existing.rows[0].cko_id;
      await client.query(`UPDATE knowledge_objects SET title=$1,object_version=object_version+1,updated_at=now() WHERE id=$2`, [remote.name, ckoId]);
      const snapshot = await client.query(`SELECT * FROM knowledge_objects WHERE id=$1`, [ckoId]);
      await client.query(
        `INSERT INTO cko_versions(id,cko_id,version,snapshot,changed_by,change_reason)
         VALUES($1,$2,$3,$4::jsonb,$5,'connector source changed')`,
        [uuidv7(), ckoId, snapshot.rows[0].object_version, JSON.stringify(snapshot.rows[0]), watch.principal_id]
      );
    }

    const artifact = await registerArtifact(client, {
      nodeId: watch.node_id, ckoId, storageLocationId: storage.rows[0].id,
      role: existing.rowCount ? "snapshot" : "original", mimeType: remote.mime,
      filename: remote.name, bytes: remote.bytes, actorPrincipalId: watch.principal_id
    });
    await client.query(`UPDATE artifacts SET is_current=(id=$2) WHERE cko_id=$1`, [ckoId, artifact.id]);
    await client.query(`UPDATE knowledge_objects SET primary_artifact_id=$2,updated_at=now() WHERE id=$1`, [ckoId, artifact.id]);

    const ingestion = await ingestTextArtifact(client, {
      nodeId: watch.node_id, ckoId, artifactId: artifact.id, mimeType: remote.mime,
      bytes: remote.bytes, actorPrincipalId: watch.principal_id
    });
    if (ingestion.ingested) await embedMissingFragments(client, watch.node_id, ckoId);

    await client.query(
      `INSERT INTO source_documents(id,watched_source_id,remote_id,cko_id,remote_version,content_sha256,remote_modified_at,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT(watched_source_id,remote_id) DO UPDATE SET
         remote_version=EXCLUDED.remote_version,content_sha256=EXCLUDED.content_sha256,
         remote_modified_at=EXCLUDED.remote_modified_at,synced_at=now(),metadata=EXCLUDED.metadata`,
      [uuidv7(), watch.id, watch.remote_id, ckoId, remote.version ?? null, sha, remote.modified ?? null,
        JSON.stringify({ name: remote.name, mime_type: remote.mime })]
    );
    if (watch.library_id) {
      await client.query(`INSERT INTO library_memberships(library_id,cko_id,added_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [watch.library_id, ckoId, watch.principal_id]);
    }
    await client.query(
      `UPDATE watched_sources SET status='fresh',last_success_at=now(),last_changed_at=now(),last_remote_modified_at=$2,
       last_remote_version=$3,last_content_sha256=$4,next_sync_at=now()+make_interval(mins=>$5),error_message=NULL,updated_at=now()
       WHERE id=$1`,
      [watch.id, remote.modified ?? null, remote.version ?? null, sha, watch.sync_interval_minutes]
    );
    await client.query(
      `UPDATE source_sync_runs SET status='changed',previous_sha256=$2,content_sha256=$3,cko_id=$4,artifact_id=$5,completed_at=now() WHERE id=$1`,
      [runId, existing.rows[0]?.content_sha256 ?? null, sha, ckoId, artifact.id]
    );
    await client.query(`UPDATE source_connections SET status='connected',last_error=NULL,updated_at=now() WHERE id=$1`, [watch.connection_id]);
    await resolveHealth(client, watch);
    return { status: "changed", cko_id: ckoId, artifact_id: artifact.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reauth = message === "CONNECTOR_REAUTH_REQUIRED";
    await client.query(
      `UPDATE watched_sources SET status='error',error_message=$2,next_sync_at=now()+interval '15 minutes',updated_at=now() WHERE id=$1`,
      [watch.id, message]
    );
    if (reauth) await client.query(`UPDATE source_connections SET status='reauth_required',last_error=$2,updated_at=now() WHERE id=$1`, [watch.connection_id, message]);
    await client.query(`UPDATE source_sync_runs SET status='failed',error_message=$2,completed_at=now() WHERE id=$1`, [runId, message]);
    await health(client, watch, reauth ? "reauth_required" : "sync_failed", reauth ? "critical" : "warning",
      reauth ? "Source authorization expired" : "Knowledge source sync failed", message);
    return { status: "failed", error: message };
  }
}

export async function refreshHealth(client: PoolClient) {
  const stale = await client.query(
    `UPDATE watched_sources SET status='stale',updated_at=now()
     WHERE sync_enabled=true AND status='fresh'
       AND last_success_at < now()-make_interval(mins=>sync_interval_minutes*3) RETURNING *`
  );
  for (const watch of stale.rows) {
    await health(client, watch, "source_stale", "warning", "Knowledge source is stale",
      `${watch.name} has not synced successfully within its freshness window.`);
  }
  return stale.rowCount;
}

export async function syncDueSources(client: PoolClient, limit = 20) {
  const due = await client.query(
    `SELECT id FROM watched_sources WHERE sync_enabled=true AND next_sync_at<=now() AND status<>'syncing'
     ORDER BY next_sync_at LIMIT $1`, [limit]
  );
  const results = [];
  for (const row of due.rows) results.push(await syncWatch(client, row.id));
  await refreshHealth(client);
  return results;
}
