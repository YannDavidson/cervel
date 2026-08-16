import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { resolveWorkspaceSession } from "./workspace";
import { connectorStart, connectorCallback, addWatch, syncWatch, syncDueSources, refreshHealth, type Provider } from "./connectors";

function token(request: FastifyRequest) {
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = String(request.headers.cookie ?? "").split(";").map(value => value.trim()).find(value => value.startsWith("cervel_session="));
  if (!cookie) throw Object.assign(new Error("WORKSPACE_SESSION_REQUIRED"), { statusCode: 401 });
  return decodeURIComponent(cookie.slice("cervel_session=".length));
}
async function session(request: FastifyRequest) { return withTransaction(client => resolveWorkspaceSession(client, token(request))); }
function provider(value: string): Provider {
  if (!["google_drive", "dropbox", "onedrive"].includes(value)) throw Object.assign(new Error("CONNECTOR_PROVIDER_INVALID"), { statusCode: 400 });
  return value as Provider;
}

export function registerConnectorRoutes(app: FastifyInstance) {
  app.post("/v1/connectors/:provider/start", async (request, reply) => {
    const s = await session(request);
    const { provider: value } = request.params as { provider: string };
    return reply.send(await withTransaction(client => connectorStart(client, s, provider(value))));
  });

  app.get("/v1/connectors/:provider/callback", async (request, reply) => {
    const { provider: value } = request.params as { provider: string };
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
    if (error) return reply.code(401).send({ error: `CONNECTOR_${error}` });
    if (!code || !state) return reply.code(400).send({ error: "CONNECTOR_CODE_AND_STATE_REQUIRED" });
    return reply.send(await withTransaction(client => connectorCallback(client, provider(value), code, state)));
  });

  app.get("/v1/connectors", async (request, reply) => {
    const s = await session(request);
    const result = await withTransaction(client => client.query(
      `SELECT id,provider,account_email,status,last_error,token_expires_at,created_at,updated_at
       FROM source_connections WHERE node_id=$1 AND workspace_id=$2 ORDER BY created_at DESC`,
      [s.node_id, s.workspace_id]
    ));
    return reply.send(result.rows);
  });

  app.delete("/v1/connectors/:id", async (request, reply) => {
    const s = await session(request);
    const { id } = request.params as { id: string };
    const row = await withTransaction(async client => {
      const updated = await client.query(
        `UPDATE source_connections SET status='disconnected',access_token_ciphertext=NULL,refresh_token_ciphertext=NULL,
         token_expires_at=NULL,updated_at=now() WHERE id=$1 AND node_id=$2 AND workspace_id=$3 RETURNING id,provider,status`,
        [id, s.node_id, s.workspace_id]
      );
      if (updated.rowCount === 1) {
        await client.query(`UPDATE watched_sources SET sync_enabled=false,status='paused',updated_at=now() WHERE connection_id=$1`, [id]);
      }
      return updated;
    });
    if (row.rowCount !== 1) return reply.code(404).send({ error: "SOURCE_CONNECTION_NOT_FOUND" });
    return reply.send(row.rows[0]);
  });

  app.post("/v1/watched-sources", async (request, reply) => {
    const s = await session(request);
    const body = request.body as any;
    if (!body?.connection_id || !body?.remote_id || !body?.name) return reply.code(400).send({ error: "CONNECTION_REMOTE_AND_NAME_REQUIRED" });
    if (body.remote_kind && body.remote_kind !== "file") return reply.code(400).send({ error: "WATCHED_SOURCE_FILE_ONLY_V0_1" });
    const interval = body.sync_interval_minutes == null ? 60 : Number(body.sync_interval_minutes);
    if (!Number.isInteger(interval) || interval < 5 || interval > 10080) return reply.code(400).send({ error: "SYNC_INTERVAL_INVALID" });
    return reply.code(201).send(await withTransaction(client => addWatch(client, s, {
      connectionId: body.connection_id, remoteId: body.remote_id, name: body.name, remoteKind: "file",
      mimeType: body.mime_type, libraryId: body.library_id, intervalMinutes: interval
    })));
  });

  app.get("/v1/watched-sources", async (request, reply) => {
    const s = await session(request);
    const result = await withTransaction(client => client.query(
      `SELECT ws.*,sc.provider,sc.account_email FROM watched_sources ws
       JOIN source_connections sc ON sc.id=ws.connection_id
       WHERE ws.node_id=$1 AND ws.workspace_id=$2 ORDER BY ws.created_at DESC`, [s.node_id, s.workspace_id]
    ));
    return reply.send(result.rows);
  });

  app.get("/v1/watched-sources/:id/runs", async (request, reply) => {
    const s = await session(request);
    const { id } = request.params as { id: string };
    const result = await withTransaction(client => client.query(
      `SELECT r.* FROM source_sync_runs r JOIN watched_sources ws ON ws.id=r.watched_source_id
       WHERE r.watched_source_id=$1 AND ws.node_id=$2 AND ws.workspace_id=$3 ORDER BY r.started_at DESC LIMIT 100`,
      [id, s.node_id, s.workspace_id]
    ));
    return reply.send(result.rows);
  });

  app.post("/v1/watched-sources/:id/sync", async (request, reply) => {
    const s = await session(request);
    const { id } = request.params as { id: string };
    const allowed = await withTransaction(client => client.query(`SELECT 1 FROM watched_sources WHERE id=$1 AND node_id=$2 AND workspace_id=$3`, [id, s.node_id, s.workspace_id]));
    if (allowed.rowCount !== 1) return reply.code(404).send({ error: "WATCHED_SOURCE_NOT_FOUND" });
    return reply.send(await withTransaction(client => syncWatch(client, id)));
  });

  app.patch("/v1/watched-sources/:id", async (request, reply) => {
    const s = await session(request);
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const interval = body?.sync_interval_minutes == null ? null : Number(body.sync_interval_minutes);
    if (interval !== null && (!Number.isInteger(interval) || interval < 5 || interval > 10080)) return reply.code(400).send({ error: "SYNC_INTERVAL_INVALID" });
    const row = await withTransaction(client => client.query(
      `UPDATE watched_sources SET sync_enabled=COALESCE($1,sync_enabled),sync_interval_minutes=COALESCE($2,sync_interval_minutes),
       status=CASE WHEN $1=false THEN 'paused' WHEN $1=true AND status='paused' THEN 'pending' ELSE status END,
       next_sync_at=CASE WHEN $1=true THEN now() ELSE next_sync_at END,updated_at=now()
       WHERE id=$3 AND node_id=$4 AND workspace_id=$5 RETURNING *`,
      [typeof body?.sync_enabled === "boolean" ? body.sync_enabled : null, interval, id, s.node_id, s.workspace_id]
    ));
    if (row.rowCount !== 1) return reply.code(404).send({ error: "WATCHED_SOURCE_NOT_FOUND" });
    return reply.send(row.rows[0]);
  });

  app.get("/v1/knowledge-health", async (request, reply) => {
    const s = await session(request);
    await withTransaction(client => refreshHealth(client));
    const result = await withTransaction(client => client.query(
      `SELECT * FROM knowledge_health_notifications WHERE node_id=$1 AND workspace_id=$2 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,created_at DESC`,
      [s.node_id, s.workspace_id]
    ));
    return reply.send(result.rows);
  });

  app.post("/v1/knowledge-health/:id/read", async (request, reply) => {
    const s = await session(request);
    const { id } = request.params as { id: string };
    const row = await withTransaction(client => client.query(
      `UPDATE knowledge_health_notifications SET read_at=now() WHERE id=$1 AND node_id=$2 AND workspace_id=$3 RETURNING *`,
      [id, s.node_id, s.workspace_id]
    ));
    if (row.rowCount !== 1) return reply.code(404).send({ error: "HEALTH_NOTIFICATION_NOT_FOUND" });
    return reply.send(row.rows[0]);
  });

  app.post("/v1/internal/connectors/sync-due", async (request, reply) => {
    const expected = process.env.CERVEL_AUTOMATION_KEY;
    const supplied = request.headers["x-cervel-automation-key"];
    if (!expected || typeof supplied !== "string" || supplied !== expected) return reply.code(401).send({ error: "AUTOMATION_KEY_INVALID" });
    const body = request.body as { limit?: number } | undefined;
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 20), 100));
    return reply.send({ results: await withTransaction(client => syncDueSources(client, limit)) });
  });
}
