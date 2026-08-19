import { Client, type ClientConfig } from "pg";
import { uuidv7 } from "../../apps/api/src/uuidv7";

function databaseConfig(): ClientConfig {
  const connectionString=process.env.DATABASE_URL?.trim();
  if(connectionString)return {connectionString};
  const user=process.env.DB_USER?.trim(),password=process.env.DB_PASS,database=process.env.DB_NAME?.trim(),host=process.env.INSTANCE_UNIX_SOCKET?.trim()||process.env.DB_HOST?.trim();
  if(!user||!password||!database||!host)throw new Error("DATABASE_URL or DB_USER, DB_PASS, DB_NAME and INSTANCE_UNIX_SOCKET/DB_HOST are required");
  return {user,password,database,host,port:Number(process.env.DB_PORT??5432)};
}

async function main() {
  const authority = process.env.CERVEL_NODE_AUTHORITY ?? "local";
  const nodeName = process.env.CERVEL_NODE_NAME ?? "CERVEL Local Node";
  const adminSubject = process.env.CERVEL_BOOTSTRAP_ADMIN_SUBJECT ?? "local-admin";
  const client = new Client(databaseConfig());
  await client.connect();
  try {
    await client.query("BEGIN");
    let nodeId: string;
    const existingNode = await client.query(`SELECT id FROM nodes WHERE slug = $1`, [authority]);
    if (existingNode.rowCount) nodeId = existingNode.rows[0].id;
    else { nodeId = uuidv7(); await client.query(`INSERT INTO nodes (id,slug,name,deployment_mode) VALUES ($1,$2,$3,'managed')`,[nodeId, authority, nodeName]); }

    let principalId: string;
    const existingPrincipal = await client.query(`SELECT id FROM principals WHERE node_id = $1 AND external_subject = $2`,[nodeId, adminSubject]);
    if (existingPrincipal.rowCount) principalId = existingPrincipal.rows[0].id;
    else { principalId = uuidv7(); await client.query(`INSERT INTO principals (id,node_id,principal_type,display_name,external_subject,attributes) VALUES ($1,$2,'human','CERVEL Bootstrap Admin',$3,'{"role":"admin"}'::jsonb)`,[principalId, nodeId, adminSubject]); }

    let workspaceId: string;
    const existingWorkspace = await client.query(`SELECT id FROM workspaces WHERE node_id = $1 AND slug = 'default'`,[nodeId]);
    if (existingWorkspace.rowCount) workspaceId = existingWorkspace.rows[0].id;
    else { workspaceId = uuidv7(); await client.query(`INSERT INTO workspaces (id,node_id,slug,name,created_by) VALUES ($1,$2,'default','Default Workspace',$3)`,[workspaceId, nodeId, principalId]); }

    let storageLocationId: string;
    const existingStorage = await client.query(`SELECT id FROM storage_locations WHERE node_id = $1 AND is_primary = true LIMIT 1`,[nodeId]);
    if (existingStorage.rowCount) storageLocationId = existingStorage.rows[0].id;
    else { storageLocationId = uuidv7(); await client.query(`INSERT INTO storage_locations (id,node_id,provider_type,config_ref,is_primary) VALUES ($1,$2,'s3','env:s3',true)`,[storageLocationId, nodeId]); }

    await client.query("COMMIT");
    console.log(JSON.stringify({event:"cervel_bootstrap",nodeId,workspaceId,principalId,storageLocationId,authority}));
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { await client.end(); }
}

main().catch((error) => { console.error(error); process.exit(1); });
