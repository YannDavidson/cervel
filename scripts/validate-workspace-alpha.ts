import { db, withTransaction } from "../apps/api/src/db";
import { uuidv7 } from "../apps/api/src/uuidv7";
import {
  createWorkspaceSession,
  resolveWorkspaceSession,
  revokeWorkspaceSession,
  workspaceBootstrap,
  listWorkspaceObjects,
  loadWorkspaceObject
} from "../apps/api/src/workspace";

async function expectSessionRejected(token: string) {
  let rejected = false;
  try {
    await withTransaction(client => resolveWorkspaceSession(client, token));
  } catch (error) {
    rejected = error instanceof Error && error.message === "INVALID_OR_EXPIRED_SESSION";
  }
  if (!rejected) throw new Error("SESSION_SHOULD_BE_REJECTED");
}

async function main() {
  const nodeId = uuidv7();
  const principalId = uuidv7();
  const workspaceA = uuidv7();
  const workspaceB = uuidv7();
  const objectA = uuidv7();
  const objectB = uuidv7();
  const libraryA = uuidv7();
  const libraryB = uuidv7();

  await withTransaction(async client => {
    await client.query(`INSERT INTO nodes(id,slug,name,deployment_mode) VALUES ($1,$2,$3,'managed')`, [nodeId, `workspace-alpha-${nodeId.slice(0,8)}`, "Workspace Alpha Test"]);
    await client.query(`INSERT INTO principals(id,node_id,principal_type,display_name,attributes) VALUES ($1,$2,'human','Workspace Tester',$3::jsonb)`, [principalId, nodeId, JSON.stringify({ role: "admin" })]);
    await client.query(`INSERT INTO workspaces(id,node_id,slug,name,created_by) VALUES ($1,$3,'a','Workspace A',$2),($4,$3,'b','Workspace B',$2)`, [workspaceA, principalId, nodeId, workspaceB]);
    await client.query(`INSERT INTO libraries(id,node_id,workspace_id,slug,name,created_by) VALUES ($1,$3,$4,'a','Library A',$2),($5,$3,$6,'b','Library B',$2)`, [libraryA, principalId, nodeId, workspaceA, libraryB, workspaceB]);
    await client.query(`INSERT INTO knowledge_objects(id,node_id,workspace_id,type,title,created_by) VALUES ($1,$3,$4,'note','Visible A',$2),($5,$3,$6,'note','Hidden B',$2)`, [objectA, principalId, nodeId, workspaceA, objectB, workspaceB]);
  });

  const created = await withTransaction(client => createWorkspaceSession(client, { principalId, nodeId, workspaceId: workspaceA }));
  const session = await withTransaction(client => resolveWorkspaceSession(client, created.token));
  if (session.workspace_id !== workspaceA) throw new Error("SESSION_WORKSPACE_BINDING_LOST");

  const bootstrap = await withTransaction(client => workspaceBootstrap(client, session));
  if (bootstrap.workspaces.length !== 1 || bootstrap.workspaces[0].id !== workspaceA) throw new Error("BOOTSTRAP_WORKSPACE_SCOPE_LEAK");
  if (bootstrap.libraries.length !== 1 || bootstrap.libraries[0].id !== libraryA) throw new Error("BOOTSTRAP_LIBRARY_SCOPE_LEAK");

  const objects = await withTransaction(client => listWorkspaceObjects(client, session));
  if (objects.length !== 1 || objects[0].id !== objectA) throw new Error("OBJECT_LIST_SCOPE_LEAK");

  let hiddenDenied = false;
  try {
    await withTransaction(client => loadWorkspaceObject(client, session, objectB));
  } catch (error) {
    hiddenDenied = error instanceof Error && error.message === "CKO_NOT_FOUND";
  }
  if (!hiddenDenied) throw new Error("DIRECT_OBJECT_SCOPE_LEAK");

  await withTransaction(async client => {
    await client.query(`UPDATE workspace_sessions SET expires_at=now()-interval '1 minute' WHERE id=$1`, [created.session.id]);
  });
  await expectSessionRejected(created.token);

  const revocable = await withTransaction(client => createWorkspaceSession(client, { principalId, nodeId, workspaceId: workspaceA }));
  await withTransaction(client => revokeWorkspaceSession(client, revocable.token));
  await expectSessionRejected(revocable.token);

  const hashes = await db.query(`SELECT token_hash FROM workspace_sessions WHERE principal_id=$1`, [principalId]);
  if (hashes.rows.some(row => String(row.token_hash).includes(created.token) || String(row.token_hash).includes(revocable.token))) {
    throw new Error("RAW_SESSION_TOKEN_PERSISTED");
  }

  console.log(JSON.stringify({ ok: true, workspace_scope: true, expiry: true, revocation: true, token_hashing: true }));
}

main().finally(() => db.end());
