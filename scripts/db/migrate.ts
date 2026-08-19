import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client, type ClientConfig } from "pg";

function stripMigrationTransaction(sql: string): string {
  return sql.replace(/^\s*BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, "").trim();
}

function databaseConfig(): ClientConfig {
  const connectionString=process.env.DATABASE_URL?.trim();
  if(connectionString)return {connectionString};
  const user=process.env.DB_USER?.trim(),password=process.env.DB_PASS,database=process.env.DB_NAME?.trim(),host=process.env.INSTANCE_UNIX_SOCKET?.trim()||process.env.DB_HOST?.trim();
  if(!user||!password||!database||!host)throw new Error("DATABASE_URL or DB_USER, DB_PASS, DB_NAME and INSTANCE_UNIX_SOCKET/DB_HOST are required");
  return {user,password,database,host,port:Number(process.env.DB_PORT??5432)};
}

async function main() {
  const client = new Client(databaseConfig());
  await client.connect();
  try {
    await client.query(`SELECT pg_advisory_lock(hashtextextended('cervel-schema-migrations',0))`);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const dir = resolve(process.cwd(), "db/migrations");
    const files = (await readdir(dir)).filter(name => name.endsWith(".sql")).sort();
    for (const file of files) {
      const applied = await client.query(`SELECT 1 FROM schema_migrations WHERE filename=$1`, [file]);
      if (applied.rowCount) { console.log(`Skipping ${file} (already applied)`); continue; }
      process.stdout.write(`Applying ${file}... `);
      const sql = stripMigrationTransaction(await readFile(resolve(dir, file), "utf8"));
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations(filename) VALUES($1)`, [file]);
        await client.query("COMMIT");
        console.log("ok");
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally {
    try { await client.query(`SELECT pg_advisory_unlock(hashtextextended('cervel-schema-migrations',0))`); } catch {}
    await client.end();
  }
}
main().catch(error=>{console.error(error);process.exit(1);});
