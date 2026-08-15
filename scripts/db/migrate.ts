import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

function stripMigrationTransaction(sql: string): string {
  return sql
    .replace(/^\s*BEGIN;\s*/i, "")
    .replace(/\s*COMMIT;\s*$/i, "")
    .trim();
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const dir = resolve(process.cwd(), "db/migrations");
    const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();

    for (const file of files) {
      const applied = await client.query(`SELECT 1 FROM schema_migrations WHERE filename = $1`, [file]);
      if (applied.rowCount) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      process.stdout.write(`Applying ${file}... `);
      const rawSql = await readFile(resolve(dir, file), "utf8");
      const sql = stripMigrationTransaction(rawSql);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log("ok");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
