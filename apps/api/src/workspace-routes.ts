import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTransaction } from "./db";
import { assembleContextPackage } from "./context";
import { executeSemanticKnowledgeReasoning } from "./semantic-reasoning";
import { createWorkspaceSession, resolveWorkspaceSession, revokeWorkspaceSession, workspaceBootstrap, listWorkspaceObjects, loadWorkspaceObject, listSemanticEntities, loadSemanticEntity, loadGraph } from "./workspace";
import { loadKnowledgeIntelligenceWorkspace } from "./intelligence-workspace";
import { renderWorkspaceAlpha } from "../../web/src/workspace-ui";
import { renderKnowledgeIntelligenceWorkspace } from "../../web/src/intelligence-workspace-ui";
import { registerIdentityRoutes } from "./identity-routes";
import { registerExperienceRoutes } from "./experience-routes";

function tokenFrom(request: FastifyRequest): string {
  const raw = request.headers.authorization;
  if (raw?.startsWith("Bearer ")) return raw.slice(7);
  const cookies = String(request.headers.cookie ?? "").split(";").map(v => v.trim());
  const match = cookies.find(v => v.startsWith("cervel_session="));
  if (!match) throw Object.assign(new Error("WORKSPACE_SESSION_REQUIRED"), { statusCode: 401 });
  return decodeURIComponent(match.slice("cervel_session=".length));
}
async function session(request: FastifyRequest) { return withTransaction(client => resolveWorkspaceSession(client, tokenFrom(request))); }

export function registerWorkspaceRoutes(app: FastifyInstance) {
  registerIdentityRoutes(app);
  registerExperienceRoutes(app);
  app.get("/workspace", async (_request, reply) => reply.type("text/html; charset=utf-8").send(renderKnowledgeIntelligenceWorkspace()));
  app.get("/workspace/alpha", async (_request, reply) => reply.type("text/html; charset=utf-8").send(renderWorkspaceAlpha()));

  // Legacy Alpha bootstrap session remains available for local/dev environments only.
  app.post("/v1/session", async (request, reply) => {
    if (process.env.CERVEL_ALLOW_ALPHA_LOGIN !== "true") return reply.code(404).send({ error: "ALPHA_LOGIN_DISABLED" });
    const body = request.body as { node_id?: string; principal_id?: string; workspace_id?: string | null };
    if (!body?.node_id || !body?.principal_id) return reply.code(400).send({ error: "NODE_AND_PRINCIPAL_REQUIRED" });
    const result = await withTransaction(client => createWorkspaceSession(client, { nodeId: body.node_id!, principalId: body.principal_id!, workspaceId: body.workspace_id ?? null }));
    return reply.code(201).send(result);
  });

  app.delete("/v1/session", async (request, reply) => {
    const token = tokenFrom(request);
    await withTransaction(client => revokeWorkspaceSession(client, token));
    reply.header("set-cookie", "cervel_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return reply.code(204).send();
  });

  app.get("/v1/workspace", async (request, reply) => { const s = await session(request); return reply.send(await withTransaction(client => workspaceBootstrap(client, s))); });
  app.get("/v1/workspace/intelligence", async (request, reply) => { const s = await session(request); return reply.send(await withTransaction(client => loadKnowledgeIntelligenceWorkspace(client, s))); });
  app.get("/v1/workspace/objects", async (request, reply) => { const s = await session(request); const { q } = request.query as { q?: string }; return reply.send(await withTransaction(client => listWorkspaceObjects(client, s, q))); });
  app.get("/v1/workspace/objects/:id", async (request, reply) => { const s = await session(request); const { id } = request.params as { id: string }; return reply.send(await withTransaction(client => loadWorkspaceObject(client, s, id))); });
  app.get("/v1/workspace/entities", async (request, reply) => { const s = await session(request); const { q } = request.query as { q?: string }; return reply.send(await withTransaction(client => listSemanticEntities(client, s, q))); });
  app.get("/v1/workspace/entities/:id", async (request, reply) => { const s = await session(request); const { id } = request.params as { id: string }; return reply.send(await withTransaction(client => loadSemanticEntity(client, s, id))); });
  app.get("/v1/workspace/graph", async (request, reply) => { const s = await session(request); const { entity_id } = request.query as { entity_id?: string }; return reply.send(await withTransaction(client => loadGraph(client, s, entity_id))); });
  app.post("/v1/workspace/ask", async (request, reply) => {
    const s = await session(request);
    const body = request.body as { query?: string; library_ids?: string[]; as_of?: string };
    if (!body?.query?.trim()) return reply.code(400).send({ error: "QUERY_REQUIRED" });
    const result = await withTransaction(async client => {
      const ccp = await assembleContextPackage(client, { nodeId: String(s.node_id), workspaceId: s.workspace_id ? String(s.workspace_id) : null, principalId: String(s.principal_id), query: body.query!.trim(), asOf: body.as_of ?? null, libraryIds: body.library_ids ?? [] });
      return executeSemanticKnowledgeReasoning(client, ccp.id, String(s.principal_id));
    });
    return reply.code(201).send(result);
  });
}
