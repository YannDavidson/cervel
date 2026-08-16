import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { resolveWorkspaceSession } from "./workspace";
import { captureKnowledge, listInbox, createLibrary, updateLibrary, setLibraryMembership, editObject } from "./experience";

function tokenFrom(request: FastifyRequest): string {
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookies = String(request.headers.cookie ?? "").split(";").map(v => v.trim());
  const match = cookies.find(v => v.startsWith("cervel_session="));
  if (!match) throw Object.assign(new Error("WORKSPACE_SESSION_REQUIRED"), { statusCode: 401 });
  return decodeURIComponent(match.slice("cervel_session=".length));
}
async function session(request: FastifyRequest) { return withTransaction(client => resolveWorkspaceSession(client, tokenFrom(request))); }

export function registerExperienceRoutes(app: FastifyInstance) {
  app.post("/v1/workspace/capture", async (request, reply) => {
    const s = await session(request);
    const body = request.body as { title?: string; source_type?: "upload"|"clip"|"note"; type?: string; filename?: string; mime_type?: string; content_base64?: string; content_text?: string; source_url?: string; library_ids?: string[] };
    if (!body?.title?.trim() || !body.source_type) return reply.code(400).send({ error: "TITLE_AND_SOURCE_TYPE_REQUIRED" });
    const result = await withTransaction(client => captureKnowledge(client, s, {
      title: body.title!.trim(), sourceType: body.source_type!, type: body.type, filename: body.filename,
      mimeType: body.mime_type, contentBase64: body.content_base64, contentText: body.content_text,
      sourceUrl: body.source_url, libraryIds: body.library_ids
    }));
    return reply.code(result.status === "ready" ? 201 : 422).send(result);
  });

  app.get("/v1/workspace/inbox", async (request, reply) => {
    const s = await session(request);
    const { status } = request.query as { status?: string };
    return reply.send(await withTransaction(client => listInbox(client, s, status)));
  });

  app.post("/v1/workspace/libraries", async (request, reply) => {
    const s = await session(request);
    const body = request.body as { name?: string; description?: string };
    if (!body?.name?.trim()) return reply.code(400).send({ error: "LIBRARY_NAME_REQUIRED" });
    return reply.code(201).send(await withTransaction(client => createLibrary(client, s, { name: body.name!.trim(), description: body.description })));
  });

  app.patch("/v1/workspace/libraries/:id", async (request, reply) => {
    const s = await session(request); const { id } = request.params as { id: string };
    const body = request.body as { name?: string; description?: string | null };
    return reply.send(await withTransaction(client => updateLibrary(client, s, id, body ?? {})));
  });

  app.put("/v1/workspace/libraries/:id/objects/:ckoId", async (request, reply) => {
    const s = await session(request); const { id, ckoId } = request.params as { id: string; ckoId: string };
    return reply.send(await withTransaction(client => setLibraryMembership(client, s, id, ckoId, true)));
  });

  app.delete("/v1/workspace/libraries/:id/objects/:ckoId", async (request, reply) => {
    const s = await session(request); const { id, ckoId } = request.params as { id: string; ckoId: string };
    return reply.send(await withTransaction(client => setLibraryMembership(client, s, id, ckoId, false)));
  });

  app.get("/v1/workspace/objects/:id/editor", async (request, reply) => {
    const s = await session(request); const { id } = request.params as { id: string };
    const result = await withTransaction(async client => {
      const object = await client.query(`SELECT id,title,summary,object_version FROM knowledge_objects WHERE id=$1 AND node_id=$2 AND workspace_id=$3 AND lifecycle_status<>'deleted'`, [id, s.node_id, s.workspace_id]);
      if (object.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
      const [note, memberships] = await Promise.all([
        client.query(`SELECT body,version,updated_at FROM object_notes WHERE cko_id=$1`, [id]),
        client.query(`SELECT l.id,l.name FROM library_memberships lm JOIN libraries l ON l.id=lm.library_id WHERE lm.cko_id=$1 AND l.workspace_id=$2 ORDER BY l.name`, [id, s.workspace_id])
      ]);
      return { ...object.rows[0], note: note.rows[0]?.body ?? "", note_version: note.rows[0]?.version ?? 0, libraries: memberships.rows };
    });
    return reply.send(result);
  });

  app.patch("/v1/workspace/objects/:id", async (request, reply) => {
    const s = await session(request); const { id } = request.params as { id: string };
    const body = request.body as { title?: string; summary?: string | null; note?: string };
    return reply.send(await withTransaction(client => editObject(client, s, id, body ?? {})));
  });
}
