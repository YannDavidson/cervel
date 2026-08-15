import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";

export interface EmbeddingProvider {
  id: string;
  provider: string;
  modelName: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
}

export class DeterministicEmbeddingProvider implements EmbeddingProvider {
  id = "local-deterministic-v0.1";
  provider = "local";
  modelName = "deterministic-v0.1";
  dimensions = 64;

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const token of tokens) {
      const digest = createHash("sha256").update(token).digest();
      const index = digest.readUInt16BE(0) % this.dimensions;
      const sign = (digest[2] & 1) === 0 ? 1 : -1;
      vector[index] += sign * (1 + digest[3] / 255);
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / norm);
  }
}

export const embeddingProvider: EmbeddingProvider = new DeterministicEmbeddingProvider();

export function vectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

export async function ensureEmbeddingModel(client: PoolClient, nodeId: string, provider: EmbeddingProvider): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM models WHERE node_id = $1 AND provider = $2 AND model_name = $3 AND purpose = 'embedding' LIMIT 1`,
    [nodeId, provider.provider, provider.modelName]
  );
  if (existing.rowCount) return existing.rows[0].id;
  const id = uuidv7();
  await client.query(
    `INSERT INTO models (id,node_id,provider,model_name,model_version,purpose,metadata)
     VALUES ($1,$2,$3,$4,'0.1','embedding',$5::jsonb)`,
    [id, nodeId, provider.provider, provider.modelName, JSON.stringify({ dimensions: provider.dimensions })]
  );
  return id;
}

export async function embedMissingFragments(client: PoolClient, nodeId: string, ckoId?: string): Promise<number> {
  const modelId = await ensureEmbeddingModel(client, nodeId, embeddingProvider);
  const rows = await client.query(
    `SELECT f.id, f.text_content
     FROM fragments f
     LEFT JOIN embeddings e ON e.fragment_id = f.id AND e.model_id = $2
     WHERE f.node_id = $1 AND f.text_content IS NOT NULL AND e.id IS NULL
       AND ($3::uuid IS NULL OR f.cko_id = $3)
     ORDER BY f.created_at`,
    [nodeId, modelId, ckoId ?? null]
  );
  for (const row of rows.rows) {
    const vector = await embeddingProvider.embed(row.text_content);
    await client.query(
      `INSERT INTO embeddings
       (id,node_id,fragment_id,model_id,dimensions,embedding,provider,model_name,normalized)
       VALUES ($1,$2,$3,$4,$5,$6::vector,$7,$8,true)`,
      [uuidv7(), nodeId, row.id, modelId, vector.length, vectorLiteral(vector), embeddingProvider.provider, embeddingProvider.modelName]
    );
  }
  return rows.rowCount ?? 0;
}
