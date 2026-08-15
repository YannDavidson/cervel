import type { PoolClient } from "pg";

export async function assertPrincipalInNode(client: PoolClient, principalId: string, nodeId: string): Promise<void> {
  const result = await client.query(
    `SELECT 1 FROM principals WHERE id = $1 AND node_id = $2 LIMIT 1`,
    [principalId, nodeId]
  );
  if (result.rowCount !== 1) {
    const error = new Error("FORBIDDEN_NODE_SCOPE");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}
