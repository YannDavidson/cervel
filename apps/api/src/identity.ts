import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
import { uuidv7 } from "./uuidv7";
import { createWorkspaceSession } from "./workspace";

const AUTH_TTL_MS = 10 * 60 * 1000;
const b64url = (bytes: Buffer) => bytes.toString("base64url");
const sha256b64 = (value: string) => createHash("sha256").update(value).digest("base64url");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error(`${name}_REQUIRED`), { statusCode: 503 });
  return value;
}

async function trustedAuthScope(client: PoolClient, requestedNodeId?: string | null, requestedWorkspaceId?: string | null) {
  const nodeId = required("CERVEL_AUTH_NODE_ID");
  const workspaceId = required("CERVEL_AUTH_WORKSPACE_ID");
  if (requestedNodeId && requestedNodeId !== nodeId) throw Object.assign(new Error("AUTH_NODE_SCOPE_FORBIDDEN"), { statusCode: 403 });
  if (requestedWorkspaceId && requestedWorkspaceId !== workspaceId) throw Object.assign(new Error("AUTH_WORKSPACE_SCOPE_FORBIDDEN"), { statusCode: 403 });
  const workspace = await client.query(`SELECT 1 FROM workspaces WHERE id=$1 AND node_id=$2`, [workspaceId, nodeId]);
  if (workspace.rowCount !== 1) throw Object.assign(new Error("AUTH_WORKSPACE_NOT_CONFIGURED"), { statusCode: 503 });
  return { nodeId, workspaceId };
}

async function discovery(issuer: string) {
  const url = new URL(".well-known/openid-configuration", issuer.endsWith("/") ? issuer : issuer + "/");
  const response = await fetch(url);
  if (!response.ok) throw Object.assign(new Error("OIDC_DISCOVERY_FAILED"), { statusCode: 502 });
  return response.json() as Promise<{ authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string }>;
}

export async function startOidc(client: PoolClient, input: { nodeId?: string | null; workspaceId?: string | null }) {
  const scope = await trustedAuthScope(client, input.nodeId, input.workspaceId);
  const issuer = required("CERVEL_OIDC_ISSUER");
  const clientId = required("CERVEL_OIDC_CLIENT_ID");
  const redirectUri = required("CERVEL_OIDC_REDIRECT_URI");
  const config = await discovery(issuer);
  const state = b64url(randomBytes(24));
  const nonce = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const id = uuidv7();
  await client.query(
    `INSERT INTO auth_challenges(id,node_id,workspace_id,kind,state,code_verifier,payload,expires_at)
     VALUES ($1,$2,$3,'oidc',$4,$5,$6::jsonb,$7)`,
    [id, scope.nodeId, scope.workspaceId, state, verifier, JSON.stringify({ issuer: config.issuer, nonce }), new Date(Date.now() + AUTH_TTL_MS)]
  );
  const url = new URL(config.authorization_endpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", sha256b64(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return { authorization_url: url.toString(), state };
}

async function consumeChallenge(client: PoolClient, kind: string, stateOrId: string, expected?: { nodeId?: string; principalId?: string }) {
  const result = await client.query(
    `UPDATE auth_challenges SET consumed_at=now()
      WHERE kind=$1 AND (state=$2 OR id::text=$2) AND consumed_at IS NULL AND expires_at>now()
        AND ($3::uuid IS NULL OR node_id=$3)
        AND ($4::uuid IS NULL OR principal_id=$4)
      RETURNING *`, [kind, stateOrId, expected?.nodeId ?? null, expected?.principalId ?? null]
  );
  if (result.rowCount !== 1) throw Object.assign(new Error("AUTH_CHALLENGE_INVALID"), { statusCode: 401 });
  return result.rows[0];
}

export async function finishOidc(client: PoolClient, input: { code: string; state: string }) {
  const challenge = await consumeChallenge(client, "oidc", input.state);
  await trustedAuthScope(client, challenge.node_id, challenge.workspace_id);
  const issuer = String(challenge.payload?.issuer ?? required("CERVEL_OIDC_ISSUER"));
  const nonce = String(challenge.payload?.nonce ?? "");
  if (!nonce) throw Object.assign(new Error("OIDC_NONCE_MISSING"), { statusCode: 401 });
  const clientId = required("CERVEL_OIDC_CLIENT_ID");
  const redirectUri = required("CERVEL_OIDC_REDIRECT_URI");
  const config = await discovery(issuer);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: challenge.code_verifier
  });
  const secret = process.env.CERVEL_OIDC_CLIENT_SECRET;
  if (secret) form.set("client_secret", secret);
  const tokenResponse = await fetch(config.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form
  });
  if (!tokenResponse.ok) throw Object.assign(new Error("OIDC_TOKEN_EXCHANGE_FAILED"), { statusCode: 401 });
  const tokens = await tokenResponse.json() as { id_token?: string };
  if (!tokens.id_token) throw Object.assign(new Error("OIDC_ID_TOKEN_MISSING"), { statusCode: 401 });
  const { payload } = await jwtVerify(tokens.id_token, createRemoteJWKSet(new URL(config.jwks_uri)), {
    issuer: config.issuer,
    audience: clientId
  });
  if (!payload.sub) throw Object.assign(new Error("OIDC_SUBJECT_MISSING"), { statusCode: 401 });
  if (payload.nonce !== nonce) throw Object.assign(new Error("OIDC_NONCE_INVALID"), { statusCode: 401 });
  const externalSubject = `oidc:${config.issuer}:${payload.sub}`;
  let principal = await client.query(`SELECT id FROM principals WHERE node_id=$1 AND external_subject=$2`, [challenge.node_id, externalSubject]);
  let principalId: string;
  if (principal.rowCount === 1) {
    principalId = principal.rows[0].id;
  } else {
    principalId = uuidv7();
    await client.query(
      `INSERT INTO principals(id,node_id,principal_type,display_name,external_subject,attributes)
       VALUES ($1,$2,'human',$3,$4,$5::jsonb)`,
      [principalId, challenge.node_id, String(payload.name ?? payload.email ?? "CERVEL User"), externalSubject, JSON.stringify({ role: "member" })]
    );
  }
  const account = await client.query(
    `SELECT id FROM identity_accounts WHERE node_id=$1 AND provider='oidc' AND issuer=$2 AND subject=$3`,
    [challenge.node_id, config.issuer, payload.sub]
  );
  const profile = { name: payload.name ?? null, picture: payload.picture ?? null };
  if (account.rowCount === 0) {
    await client.query(
      `INSERT INTO identity_accounts(id,node_id,principal_id,provider,issuer,subject,email,email_verified,profile)
       VALUES ($1,$2,$3,'oidc',$4,$5,$6,$7,$8::jsonb)`,
      [uuidv7(), challenge.node_id, principalId, config.issuer, payload.sub, payload.email ?? null, payload.email_verified === true, JSON.stringify(profile)]
    );
  } else {
    await client.query(
      `UPDATE identity_accounts SET email=$1,email_verified=$2,profile=$3::jsonb,updated_at=now() WHERE id=$4`,
      [payload.email ?? null, payload.email_verified === true, JSON.stringify(profile), account.rows[0].id]
    );
  }
  return createWorkspaceSession(client, { principalId, nodeId: challenge.node_id, workspaceId: challenge.workspace_id });
}

function rpConfig() {
  return {
    rpID: required("CERVEL_WEBAUTHN_RP_ID"),
    rpName: process.env.CERVEL_WEBAUTHN_RP_NAME ?? "CERVEL",
    origin: required("CERVEL_WEBAUTHN_ORIGIN")
  };
}

export async function passkeyRegistrationOptions(client: PoolClient, input: { nodeId: string; principalId: string; workspaceId?: string | null }) {
  const rp = rpConfig();
  const principal = await client.query(`SELECT id,display_name FROM principals WHERE id=$1 AND node_id=$2`, [input.principalId, input.nodeId]);
  if (principal.rowCount !== 1) throw Object.assign(new Error("PRINCIPAL_NOT_FOUND"), { statusCode: 404 });
  const existing = await client.query(`SELECT credential_id,transports FROM passkey_credentials WHERE principal_id=$1`, [input.principalId]);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: principal.rows[0].display_name,
    userDisplayName: principal.rows[0].display_name,
    attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    excludeCredentials: existing.rows.map(row => ({ id: row.credential_id, transports: row.transports })) as never
  });
  const id = uuidv7();
  await client.query(
    `INSERT INTO auth_challenges(id,node_id,principal_id,workspace_id,kind,challenge,expires_at)
     VALUES ($1,$2,$3,$4,'passkey_register',$5,$6)`,
    [id, input.nodeId, input.principalId, input.workspaceId ?? null, options.challenge, new Date(Date.now() + AUTH_TTL_MS)]
  );
  return { challenge_id: id, options };
}

export async function verifyPasskeyRegistration(client: PoolClient, input: { challengeId: string; response: unknown; expectedNodeId: string; expectedPrincipalId: string }) {
  const rp = rpConfig();
  const challenge = await consumeChallenge(client, "passkey_register", input.challengeId, { nodeId: input.expectedNodeId, principalId: input.expectedPrincipalId });
  const verification = await verifyRegistrationResponse({
    response: input.response as never,
    expectedChallenge: challenge.challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID
  });
  if (!verification.verified || !verification.registrationInfo) throw Object.assign(new Error("PASSKEY_REGISTRATION_FAILED"), { statusCode: 401 });
  const info = verification.registrationInfo as any;
  const credential = info.credential ?? { id: info.credentialID, publicKey: info.credentialPublicKey, counter: info.counter, transports: [] };
  await client.query(
    `INSERT INTO passkey_credentials(id,node_id,principal_id,credential_id,public_key,counter,transports,device_type,backed_up)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [uuidv7(), challenge.node_id, challenge.principal_id, String(credential.id), Buffer.from(credential.publicKey), Number(credential.counter ?? 0), credential.transports ?? [], info.credentialDeviceType ?? null, info.credentialBackedUp === true]
  );
  const existing = await client.query(`SELECT id FROM identity_accounts WHERE node_id=$1 AND principal_id=$2 AND provider='passkey'`, [challenge.node_id, challenge.principal_id]);
  if (existing.rowCount === 0) {
    await client.query(`INSERT INTO identity_accounts(id,node_id,principal_id,provider,subject) VALUES ($1,$2,$3,'passkey',$4)`, [uuidv7(), challenge.node_id, challenge.principal_id, String(credential.id)]);
  }
  return { verified: true, credential_id: String(credential.id) };
}

export async function passkeyAuthenticationOptions(client: PoolClient, input: { nodeId?: string | null; email?: string; principalId?: string }) {
  const rp = rpConfig();
  const scope = await trustedAuthScope(client, input.nodeId, null);
  let principalId = input.principalId ?? null;
  if (!principalId && input.email) {
    const account = await client.query(`SELECT principal_id FROM identity_accounts WHERE node_id=$1 AND lower(email)=lower($2) ORDER BY updated_at DESC LIMIT 1`, [scope.nodeId, input.email]);
    principalId = account.rows[0]?.principal_id ?? null;
  }
  if (!principalId) throw Object.assign(new Error("PASSKEY_IDENTITY_NOT_FOUND"), { statusCode: 404 });
  const credentials = await client.query(`SELECT credential_id,transports FROM passkey_credentials WHERE node_id=$1 AND principal_id=$2`, [scope.nodeId, principalId]);
  if (credentials.rowCount === 0) throw Object.assign(new Error("PASSKEY_NOT_ENROLLED"), { statusCode: 404 });
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "preferred",
    allowCredentials: credentials.rows.map(row => ({ id: row.credential_id, transports: row.transports })) as never
  });
  const id = uuidv7();
  await client.query(
    `INSERT INTO auth_challenges(id,node_id,principal_id,workspace_id,kind,challenge,expires_at) VALUES ($1,$2,$3,$4,'passkey_authenticate',$5,$6)`,
    [id, scope.nodeId, principalId, scope.workspaceId, options.challenge, new Date(Date.now() + AUTH_TTL_MS)]
  );
  return { challenge_id: id, options };
}

export async function verifyPasskeyAuthentication(client: PoolClient, input: { challengeId: string; response: any }) {
  const rp = rpConfig();
  const challenge = await consumeChallenge(client, "passkey_authenticate", input.challengeId);
  await trustedAuthScope(client, challenge.node_id, challenge.workspace_id);
  const credentialId = String(input.response?.id ?? "");
  const stored = await client.query(`SELECT * FROM passkey_credentials WHERE node_id=$1 AND principal_id=$2 AND credential_id=$3`, [challenge.node_id, challenge.principal_id, credentialId]);
  if (stored.rowCount !== 1) throw Object.assign(new Error("PASSKEY_CREDENTIAL_NOT_FOUND"), { statusCode: 401 });
  const row = stored.rows[0];
  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    credential: { id: row.credential_id, publicKey: new Uint8Array(row.public_key), counter: Number(row.counter), transports: row.transports } as never
  });
  if (!verification.verified) throw Object.assign(new Error("PASSKEY_AUTHENTICATION_FAILED"), { statusCode: 401 });
  const newCounter = Number((verification.authenticationInfo as any).newCounter ?? row.counter);
  if (newCounter < Number(row.counter)) throw Object.assign(new Error("PASSKEY_COUNTER_REGRESSION"), { statusCode: 401 });
  await client.query(`UPDATE passkey_credentials SET counter=$1,last_used_at=now() WHERE id=$2`, [newCounter, row.id]);
  return createWorkspaceSession(client, { principalId: challenge.principal_id, nodeId: challenge.node_id, workspaceId: challenge.workspace_id });
}
