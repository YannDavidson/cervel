import type { PoolClient } from "pg";
import type { RuntimeCorpusViewKey } from "./corpus-runtime-view";
import { resolveRetrievalScope } from "./retrieval";

export type SemanticViewCount = {
  mega_tab: string;
  canonical_cko_count: number;
  membership_count: number;
  latest_cko_updated_at: string | null;
};

export type SemanticViewDefinition = {
  key: string;
  title: string;
  tabs: unknown[];
  canonical_cko_count: number;
  membership_count: number;
  latest_cko_updated_at: string | null;
};

export function projectSemanticViews(taxonomy: any[], counts: SemanticViewCount[]): SemanticViewDefinition[] {
  const byKey = new Map(counts.map(count => [count.mega_tab, count]));
  return (Array.isArray(taxonomy) ? taxonomy : []).map(node => {
    const count = byKey.get(String(node?.key ?? ""));
    return {
      key: String(node?.key ?? ""),
      title: String(node?.title ?? node?.key ?? ""),
      tabs: Array.isArray(node?.tabs) ? node.tabs : [],
      canonical_cko_count: Number(count?.canonical_cko_count ?? 0),
      membership_count: Number(count?.membership_count ?? 0),
      latest_cko_updated_at: count?.latest_cko_updated_at ?? null
    };
  });
}

const permissionPredicate = `
  (v.branch_visibility<>'sealed' OR EXISTS(
    SELECT 1 FROM life_sealed_access_sessions s
     WHERE s.corpus_id=v.corpus_id
       AND s.principal_id=$2
       AND s.mega_tab=v.mega_tab
       AND s.subtab=v.subtab
       AND s.revoked_at IS NULL
       AND s.expires_at>now()
  ))
  AND (v.enterprise_tenant_id IS NULL OR EXISTS(
    SELECT 1 FROM enterprise_tenant_members etm
     WHERE etm.tenant_id=v.enterprise_tenant_id
       AND etm.principal_id=$2
  ))`;

export async function querySemanticViews(c: PoolClient, input: {
  nodeId: string;
  workspaceId: string;
  principalId: string;
  view: RuntimeCorpusViewKey;
}) {
  const scope = await resolveRetrievalScope(c,{nodeId:input.nodeId,workspaceId:input.workspaceId,principalId:input.principalId,requestedLibraryIds:[]});
  const corpus = await c.query(
    `SELECT cd.id,cd.corpus_key,cd.title,cd.taxonomy
       FROM corpus_definitions cd
      WHERE cd.node_id=$1
        AND cd.workspace_id=$2
        AND cd.corpus_key=$3
        AND cd.enabled=true
        AND (cd.visibility IN ('public','node') OR cd.owner_principal_id=$4 OR EXISTS(
          SELECT 1 FROM corpus_access_grants cag WHERE cag.corpus_id=cd.id AND cag.principal_id=$4
        ))`,
    [input.nodeId, input.workspaceId, input.view, input.principalId]
  );
  if (corpus.rowCount !== 1) throw Object.assign(new Error("CORPUS_RUNTIME_VIEW_FORBIDDEN"), { statusCode: 403 });

  const counts = await c.query(
    `SELECT v.mega_tab,
            count(DISTINCT v.cko_id)::int AS canonical_cko_count,
            count(*)::int AS membership_count,
            max(v.cko_updated_at) AS latest_cko_updated_at
       FROM corpus_cko_semantic_view v
      WHERE v.corpus_id=$1
        AND ${permissionPredicate}
        AND ($3::uuid[] IS NULL OR v.cko_id=ANY($3::uuid[]))
      GROUP BY v.mega_tab`,
    [corpus.rows[0].id, input.principalId, scope.allowedCkoIds]
  );
  const totals = await c.query(
    `SELECT count(DISTINCT v.cko_id)::int AS canonical_cko_count,
            count(*)::int AS membership_count
       FROM corpus_cko_semantic_view v
      WHERE v.corpus_id=$1
        AND ${permissionPredicate}
        AND ($3::uuid[] IS NULL OR v.cko_id=ANY($3::uuid[]))`,
    [corpus.rows[0].id, input.principalId, scope.allowedCkoIds]
  );

  const normalized: SemanticViewCount[] = counts.rows.map((row: any) => ({
    mega_tab: String(row.mega_tab),
    canonical_cko_count: Number(row.canonical_cko_count ?? 0),
    membership_count: Number(row.membership_count ?? 0),
    latest_cko_updated_at: row.latest_cko_updated_at ?? null
  }));
  const semanticViews = projectSemanticViews(corpus.rows[0].taxonomy ?? [], normalized);
  return {
    view: input.view,
    corpus_id: corpus.rows[0].id,
    corpus_title: corpus.rows[0].title,
    semantic_views: semanticViews,
    canonical_cko_count: Number(totals.rows[0]?.canonical_cko_count ?? 0),
    membership_count: Number(totals.rows[0]?.membership_count ?? 0),
    count_source: "persistent-corpus-memberships" as const,
    duplication_policy: "canonical-cko-references-only" as const
  };
}
