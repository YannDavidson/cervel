import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { assertPrincipalInNode } from "./access";
import { canonicalCKURI } from "../../../packages/ckuri/src";
import { uuidv7 } from "./uuidv7";

const SESSION_TTL_HOURS = Math.max(1, Math.min(Number(process.env.CERVEL_SESSION_TTL_HOURS ?? 24), 168));
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const sessionWorkspaceId = (session: Record<string, unknown>) => session.workspace_id ? String(session.workspace_id) : null;

export async function createWorkspaceSession(client: PoolClient, input: { principalId: string; nodeId: string; workspaceId?: string | null }) {
  await assertPrincipalInNode(client, input.principalId, input.nodeId);
  if (input.workspaceId) {
    const workspace = await client.query(`SELECT id FROM workspaces WHERE id=$1 AND node_id=$2`, [input.workspaceId, input.nodeId]);
    if (workspace.rowCount !== 1) throw Object.assign(new Error("WORKSPACE_NOT_FOUND"), { statusCode: 404 });
  }
  const token = randomBytes(32).toString("base64url");
  const id = uuidv7();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600000);
  await client.query(
    `INSERT INTO workspace_sessions(id,node_id,principal_id,workspace_id,token_hash,expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, input.nodeId, input.principalId, input.workspaceId ?? null, hashToken(token), expiresAt]
  );
  return { token, session: { id, node_id: input.nodeId, principal_id: input.principalId, workspace_id: input.workspaceId ?? null, expires_at: expiresAt } };
}

export async function resolveWorkspaceSession(client: PoolClient, token: string) {
  const result = await client.query(
    `SELECT s.*,p.display_name,p.principal_type,w.name AS workspace_name,n.name AS node_name
       FROM workspace_sessions s
       JOIN principals p ON p.id=s.principal_id
       JOIN nodes n ON n.id=s.node_id
       LEFT JOIN workspaces w ON w.id=s.workspace_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()`,
    [hashToken(token)]
  );
  if (result.rowCount !== 1) throw Object.assign(new Error("INVALID_OR_EXPIRED_SESSION"), { statusCode: 401 });
  await client.query(`UPDATE workspace_sessions SET last_seen_at=now() WHERE id=$1`, [result.rows[0].id]);
  return result.rows[0];
}

export async function revokeWorkspaceSession(client: PoolClient, token: string) {
  await client.query(`UPDATE workspace_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL`, [hashToken(token)]);
}

export async function workspaceBootstrap(client: PoolClient, session: Record<string, unknown>) {
  const nodeId = String(session.node_id);
  const principalId = String(session.principal_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, principalId, nodeId);
  const [workspaces, libraries] = await Promise.all([
    client.query(`SELECT id,slug,name,created_at FROM workspaces WHERE node_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY name`, [nodeId, workspaceId]),
    client.query(`SELECT id,workspace_id,slug,name,description,created_at FROM libraries WHERE node_id=$1 AND ($2::uuid IS NULL OR workspace_id=$2) ORDER BY name`, [nodeId, workspaceId])
  ]);
  return { session, workspaces: workspaces.rows, libraries: libraries.rows };
}

export async function listWorkspaceObjects(client: PoolClient, session: Record<string, unknown>, query?: string) {
  const nodeId = String(session.node_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, String(session.principal_id), nodeId);
  const result = await client.query(
    `SELECT ko.*,n.slug AS node_authority,
            (SELECT count(*)::int FROM artifacts a WHERE a.cko_id=ko.id) AS artifact_count,
            (SELECT count(*)::int FROM fragments f WHERE f.cko_id=ko.id) AS fragment_count
       FROM knowledge_objects ko JOIN nodes n ON n.id=ko.node_id
      WHERE ko.node_id=$1 AND ko.lifecycle_status<>'deleted'
        AND ($2::uuid IS NULL OR ko.workspace_id=$2)
        AND ($3::text IS NULL OR ko.title ILIKE '%'||$3||'%' OR coalesce(ko.summary,'') ILIKE '%'||$3||'%')
      ORDER BY ko.updated_at DESC,ko.created_at DESC LIMIT 100`,
    [nodeId, workspaceId, query?.trim() || null]
  );
  return result.rows.map(row => ({ ...row, canonical_uri: canonicalCKURI(row.node_authority, row.id) }));
}

export async function loadWorkspaceObject(client: PoolClient, session: Record<string, unknown>, id: string) {
  const nodeId = String(session.node_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, String(session.principal_id), nodeId);
  const object = await client.query(
    `SELECT ko.*,n.slug AS node_authority
       FROM knowledge_objects ko JOIN nodes n ON n.id=ko.node_id
      WHERE ko.id=$1 AND ko.node_id=$2 AND ko.lifecycle_status<>'deleted'
        AND ($3::uuid IS NULL OR ko.workspace_id=$3)`,
    [id, nodeId, workspaceId]
  );
  if (object.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
  const [artifacts, fragments, claims] = await Promise.all([
    client.query(`SELECT id,role,mime_type,object_key,size_bytes,sha256,metadata,created_at FROM artifacts WHERE cko_id=$1 ORDER BY created_at DESC`, [id]),
    client.query(`SELECT id,ordinal,type,locator,text_content,content_sha256,created_at FROM fragments WHERE cko_id=$1 ORDER BY ordinal LIMIT 200`, [id]),
    client.query(`SELECT DISTINCT c.id,c.predicate,c.epistemic_status,c.confidence,c.semantic_predicate,c.qualifiers,c.created_at FROM claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN fragments f ON f.id=ce.fragment_id WHERE f.cko_id=$1 ORDER BY c.created_at DESC LIMIT 100`, [id])
  ]);
  return { ...object.rows[0], canonical_uri: canonicalCKURI(object.rows[0].node_authority, id), artifacts: artifacts.rows, fragments: fragments.rows, claims: claims.rows };
}

export async function listSemanticEntities(client: PoolClient, session: Record<string, unknown>, query?: string) {
  const nodeId = String(session.node_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, String(session.principal_id), nodeId);
  const result = await client.query(
    `SELECT e.id,e.kind,e.canonical_name,e.normalized_name,e.resolution_confidence,count(DISTINCT c.id)::int AS claim_count
       FROM entities e
       JOIN claims c ON (c.semantic_subject_entity_id=e.id OR c.semantic_object_entity_id=e.id)
      WHERE e.node_id=$1
        AND ($2::text IS NULL OR e.canonical_name ILIKE '%'||$2||'%')
        AND ($3::uuid IS NULL OR EXISTS (
          SELECT 1 FROM claim_evidence ce JOIN fragments f ON f.id=ce.fragment_id JOIN knowledge_objects ko ON ko.id=f.cko_id
          WHERE ce.claim_id=c.id AND ko.workspace_id=$3))
      GROUP BY e.id ORDER BY claim_count DESC,e.canonical_name LIMIT 200`,
    [nodeId, query?.trim() || null, workspaceId]
  );
  return result.rows;
}

export async function loadSemanticEntity(client: PoolClient, session: Record<string, unknown>, id: string) {
  const nodeId = String(session.node_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, String(session.principal_id), nodeId);
  const entity = await client.query(
    `SELECT e.* FROM entities e
      WHERE e.id=$1 AND e.node_id=$2
        AND ($3::uuid IS NULL OR EXISTS (
          SELECT 1 FROM claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN fragments f ON f.id=ce.fragment_id JOIN knowledge_objects ko ON ko.id=f.cko_id
          WHERE (c.semantic_subject_entity_id=e.id OR c.semantic_object_entity_id=e.id) AND ko.workspace_id=$3))`,
    [id, nodeId, workspaceId]
  );
  if (entity.rowCount !== 1) throw Object.assign(new Error("ENTITY_NOT_FOUND"), { statusCode: 404 });
  const claims = await client.query(
    `SELECT c.id,c.predicate,c.semantic_predicate,c.confidence,c.epistemic_status,c.qualifiers,
            s.canonical_name AS subject_name,o.canonical_name AS object_name,
            array_remove(array_agg(DISTINCT f.cko_id),NULL) AS cko_ids
       FROM claims c
       LEFT JOIN entities s ON s.id=c.semantic_subject_entity_id
       LEFT JOIN entities o ON o.id=c.semantic_object_entity_id
       LEFT JOIN claim_evidence ce ON ce.claim_id=c.id
       LEFT JOIN fragments f ON f.id=ce.fragment_id
       LEFT JOIN knowledge_objects ko ON ko.id=f.cko_id
      WHERE c.node_id=$1 AND (c.semantic_subject_entity_id=$2 OR c.semantic_object_entity_id=$2)
        AND ($3::uuid IS NULL OR ko.workspace_id=$3)
      GROUP BY c.id,s.canonical_name,o.canonical_name ORDER BY c.created_at DESC LIMIT 200`,
    [nodeId, id, workspaceId]
  );
  return { ...entity.rows[0], claims: claims.rows };
}

export async function loadGraph(client: PoolClient, session: Record<string, unknown>, entityId?: string) {
  const nodeId = String(session.node_id);
  const workspaceId = sessionWorkspaceId(session);
  await assertPrincipalInNode(client, String(session.principal_id), nodeId);
  const claims = await client.query(
    `SELECT c.id,c.semantic_subject_entity_id AS source,c.semantic_object_entity_id AS target,c.semantic_predicate AS predicate,c.confidence,c.qualifiers
       FROM claims c
      WHERE c.node_id=$1 AND c.semantic_subject_entity_id IS NOT NULL AND c.semantic_object_entity_id IS NOT NULL
        AND ($2::uuid IS NULL OR c.semantic_subject_entity_id=$2 OR c.semantic_object_entity_id=$2)
        AND ($3::uuid IS NULL OR EXISTS (
          SELECT 1 FROM claim_evidence ce JOIN fragments f ON f.id=ce.fragment_id JOIN knowledge_objects ko ON ko.id=f.cko_id
          WHERE ce.claim_id=c.id AND ko.workspace_id=$3))
      ORDER BY c.created_at DESC LIMIT 500`,
    [nodeId, entityId ?? null, workspaceId]
  );
  const used = new Set<string>();
  for (const claim of claims.rows) { used.add(claim.source); used.add(claim.target); }
  const entities = used.size === 0 ? { rows: [] } : await client.query(
    `SELECT id,kind,canonical_name,resolution_confidence FROM entities WHERE node_id=$1 AND id=ANY($2::uuid[]) ORDER BY canonical_name`,
    [nodeId, [...used]]
  );
  return { nodes: entities.rows, edges: claims.rows };
}
