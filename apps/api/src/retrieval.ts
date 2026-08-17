import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { canonicalCKURI } from "../../../packages/ckuri/src";
import { embeddingProvider, vectorLiteral } from "./embeddings";

export type RetrievalCandidate = {
  fragmentId: string;
  ckoId: string;
  text: string;
  lexical: number;
  semantic: number;
  freshness: number;
  final: number;
  citationUri: string;
};

export type RetrievalScope = {
  nodeId: string;
  principalId: string;
  workspaceId?: string | null;
  libraryIds: string[];
  allowedCkoIds: string[] | null;
  policySnapshotHash: string;
  allowedOperations: string[];
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function resolveRetrievalScope(
  client: PoolClient,
  input: { nodeId: string; principalId: string; workspaceId?: string | null; requestedLibraryIds?: string[] }
): Promise<RetrievalScope> {
  const principal = await client.query(`SELECT attributes FROM principals WHERE id = $1 AND node_id = $2`, [input.principalId, input.nodeId]);
  if (principal.rowCount !== 1) throw Object.assign(new Error("FORBIDDEN_NODE_SCOPE"), { statusCode: 403 });
  const isAdmin = principal.rows[0].attributes?.role === "admin";
  let allowedCkoIds: string[] | null = null;
  if (!isAdmin) {
    const grants = await client.query(
      `SELECT pb.resource_type, pb.resource_id, p.document, p.effect_default, pb.priority
       FROM policy_bindings pb JOIN policies p ON p.id = pb.policy_id
       WHERE pb.node_id = $1 AND (pb.principal_id = $2 OR pb.principal_id IS NULL) ORDER BY pb.priority DESC`,
      [input.nodeId, input.principalId]
    );
    const allow = new Set<string>(), deny = new Set<string>();
    for (const row of grants.rows) {
      const operations: string[] = Array.isArray(row.document?.allow) ? row.document.allow : [];
      const denied: string[] = Array.isArray(row.document?.deny) ? row.document.deny : [];
      const grantsRetrieve = operations.includes("AI_RETRIEVE");
      const deniesRetrieve = denied.includes("AI_RETRIEVE") || row.effect_default === "deny" && !grantsRetrieve;
      if (row.resource_type === "cko") {
        if (grantsRetrieve) allow.add(row.resource_id); if (deniesRetrieve) deny.add(row.resource_id);
      } else if (row.resource_type === "library" && grantsRetrieve) {
        const members = await client.query(`SELECT cko_id FROM library_memberships WHERE library_id = $1`, [row.resource_id]);
        for (const member of members.rows) allow.add(member.cko_id);
      } else if ((row.resource_type === "node" || row.resource_type === "workspace") && grantsRetrieve) {
        const rows = await client.query(`SELECT id FROM knowledge_objects WHERE node_id = $1 AND ($2::uuid IS NULL OR workspace_id = $2)`,
          [input.nodeId, row.resource_type === "workspace" ? row.resource_id : input.workspaceId ?? null]);
        for (const item of rows.rows) allow.add(item.id);
      }
    }
    for (const id of deny) allow.delete(id); allowedCkoIds = [...allow];
  }
  const libraryIds = input.requestedLibraryIds ?? [];
  const snapshot = { nodeId: input.nodeId, principalId: input.principalId, workspaceId: input.workspaceId ?? null,
    libraryIds, allowedCkoIds: allowedCkoIds ?? "admin-node-scope", allowedOperations: ["ai_discover","ai_read","ai_retrieve"] };
  return { nodeId: input.nodeId, principalId: input.principalId, workspaceId: input.workspaceId, libraryIds, allowedCkoIds,
    policySnapshotHash: hash(snapshot), allowedOperations: ["ai_discover","ai_read","ai_retrieve"] };
}

export function rankCandidate(lexical: number, semantic: number, freshness = 1): number {
  const relevance = Math.max(0, Math.min(1, lexical * 0.4 + semantic * 0.6));
  return Math.max(0, Math.min(1, relevance * Math.max(0.25, Math.min(1, freshness))));
}

export async function hybridRetrieve(client: PoolClient, scope: RetrievalScope, query: string, limit = 12): Promise<RetrievalCandidate[]> {
  if (scope.allowedCkoIds && scope.allowedCkoIds.length === 0) return [];
  const queryVector = await embeddingProvider.embed(query);
  const node = await client.query(`SELECT slug FROM nodes WHERE id = $1`, [scope.nodeId]);
  if (node.rowCount !== 1) throw Object.assign(new Error("NODE_NOT_FOUND"), { statusCode: 404 });
  const rows = await client.query(
    `WITH candidates AS (
       SELECT f.id AS fragment_id, f.cko_id, f.text_content,
              ts_rank_cd(to_tsvector('simple', coalesce(f.text_content,'')), plainto_tsquery('simple',$2)) AS lexical,
              CASE WHEN e.embedding IS NULL THEN 0::real ELSE (1 - (e.embedding <=> $3::vector))::real END AS semantic,
              COALESCE((SELECT max(cervel_source_freshness(ws.last_success_at,ws.sync_interval_minutes,ws.status))
                        FROM source_documents sd JOIN watched_sources ws ON ws.id=sd.watched_source_id
                        WHERE sd.cko_id=f.cko_id AND sd.deleted_at IS NULL),1.0)::real AS freshness
       FROM fragments f LEFT JOIN embeddings e ON e.fragment_id = f.id AND e.model_name = $4
       WHERE f.node_id = $1 AND f.text_content IS NOT NULL
         AND (f.artifact_id IS NULL OR EXISTS (SELECT 1 FROM artifacts current_artifact WHERE current_artifact.id=f.artifact_id AND current_artifact.is_current=true))
         AND ($5::uuid[] IS NULL OR f.cko_id = ANY($5::uuid[]))
         AND ($6::uuid IS NULL OR EXISTS (SELECT 1 FROM knowledge_objects ko WHERE ko.id=f.cko_id AND ko.workspace_id=$6))
         AND (cardinality($7::uuid[]) = 0 OR EXISTS (SELECT 1 FROM library_memberships lm WHERE lm.cko_id=f.cko_id AND lm.library_id=ANY($7::uuid[])))
     ) SELECT * FROM candidates WHERE lexical > 0 OR semantic > 0
       ORDER BY ((lexical * 0.4 + semantic * 0.6) * GREATEST(0.25,freshness)) DESC LIMIT $8`,
    [scope.nodeId,query,vectorLiteral(queryVector),embeddingProvider.modelName,scope.allowedCkoIds,scope.workspaceId??null,scope.libraryIds,limit]
  );
  return rows.rows.map(row => {
    const lexical=Number(row.lexical??0), semantic=Math.max(0,Math.min(1,Number(row.semantic??0))), freshness=Math.max(0,Math.min(1,Number(row.freshness??1)));
    return { fragmentId:row.fragment_id,ckoId:row.cko_id,text:row.text_content,lexical,semantic,freshness,
      final:rankCandidate(lexical,semantic,freshness),citationUri:`${canonicalCKURI(node.rows[0].slug,row.cko_id)}#frag/${row.fragment_id}` };
  });
}
