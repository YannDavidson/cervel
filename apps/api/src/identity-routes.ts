import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { withTransaction } from "./db";
import { resolveWorkspaceSession } from "./workspace";
import {
  startOidc, finishOidc, passkeyRegistrationOptions, verifyPasskeyRegistration,
  passkeyAuthenticationOptions, verifyPasskeyAuthentication
} from "./identity";

const COOKIE = "cervel_session";

function tokenFrom(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookies = String(request.headers.cookie ?? "").split(";").map(v => v.trim());
  const match = cookies.find(v => v.startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
}

function setSessionCookie(reply: FastifyReply, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  reply.header("set-cookie", `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure}`);
}

async function currentSession(request: FastifyRequest) {
  const token = tokenFrom(request);
  if (!token) throw Object.assign(new Error("WORKSPACE_SESSION_REQUIRED"), { statusCode: 401 });
  return withTransaction(client => resolveWorkspaceSession(client, token));
}

export function registerIdentityRoutes(app: FastifyInstance) {
  app.post("/v1/auth/oidc/start", async (request, reply) => {
    const body = request.body as { node_id?: string; workspace_id?: string | null };
    if (!body?.node_id) return reply.code(400).send({ error: "NODE_REQUIRED" });
    const result = await withTransaction(client => startOidc(client, { nodeId: body.node_id!, workspaceId: body.workspace_id ?? null }));
    return reply.send(result);
  });

  app.get("/v1/auth/oidc/callback", async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
    if (error) return reply.code(401).send({ error: `OIDC_${error}` });
    if (!code || !state) return reply.code(400).send({ error: "OIDC_CODE_AND_STATE_REQUIRED" });
    const result = await withTransaction(client => finishOidc(client, { code, state }));
    setSessionCookie(reply, result.token);
    return reply.redirect("/workspace");
  });

  app.get("/v1/auth/status", async (request, reply) => {
    try { return reply.send({ authenticated: true, session: await currentSession(request) }); }
    catch { return reply.send({ authenticated: false }); }
  });

  app.post("/v1/auth/passkeys/register/options", async (request, reply) => {
    const session = await currentSession(request);
    const result = await withTransaction(client => passkeyRegistrationOptions(client, {
      nodeId: String(session.node_id), principalId: String(session.principal_id), workspaceId: session.workspace_id ? String(session.workspace_id) : null
    }));
    return reply.send(result);
  });

  app.post("/v1/auth/passkeys/register/verify", async (request, reply) => {
    await currentSession(request);
    const body = request.body as { challenge_id?: string; response?: unknown };
    if (!body?.challenge_id || !body.response) return reply.code(400).send({ error: "PASSKEY_CHALLENGE_AND_RESPONSE_REQUIRED" });
    return reply.send(await withTransaction(client => verifyPasskeyRegistration(client, { challengeId: body.challenge_id!, response: body.response })));
  });

  app.post("/v1/auth/passkeys/authenticate/options", async (request, reply) => {
    const body = request.body as { node_id?: string; email?: string; principal_id?: string };
    if (!body?.node_id) return reply.code(400).send({ error: "NODE_REQUIRED" });
    return reply.send(await withTransaction(client => passkeyAuthenticationOptions(client, { nodeId: body.node_id!, email: body.email, principalId: body.principal_id })));
  });

  app.post("/v1/auth/passkeys/authenticate/verify", async (request, reply) => {
    const body = request.body as { challenge_id?: string; response?: unknown; workspace_id?: string | null };
    if (!body?.challenge_id || !body.response) return reply.code(400).send({ error: "PASSKEY_CHALLENGE_AND_RESPONSE_REQUIRED" });
    const result = await withTransaction(client => verifyPasskeyAuthentication(client, { challengeId: body.challenge_id!, response: body.response, workspaceId: body.workspace_id ?? null }));
    setSessionCookie(reply, result.token);
    return reply.send({ authenticated: true, session: result.session });
  });
}
