import { Pool, PoolClient, type PoolConfig } from "pg";

function databaseConfig(): PoolConfig {
  const connectionString=process.env.DATABASE_URL?.trim();
  if(connectionString)return {connectionString};
  const user=process.env.DB_USER?.trim(),password=process.env.DB_PASS,database=process.env.DB_NAME?.trim(),host=process.env.INSTANCE_UNIX_SOCKET?.trim()||process.env.DB_HOST?.trim();
  if(!user||!password||!database||!host)throw new Error("DATABASE_URL or DB_USER, DB_PASS, DB_NAME and INSTANCE_UNIX_SOCKET/DB_HOST are required");
  return {user,password,database,host,port:Number(process.env.DB_PORT??5432),max:Number(process.env.DB_POOL_MAX??10),idleTimeoutMillis:30000,connectionTimeoutMillis:10000};
}

export const db = new Pool(databaseConfig());

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
