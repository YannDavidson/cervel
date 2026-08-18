import type { PoolClient } from "pg";
import { assertPrincipalInNode } from "./access";

const scope = (session: Record<string, unknown>) => ({
  nodeId: String(session.node_id),
  workspaceId: session.workspace_id ? String(session.workspace_id) : null,
  principalId: String(session.principal_id)
});

export async function loadKnowledgeIntelligenceWorkspace(client: PoolClient, session: Record<string, unknown>) {
  const { nodeId, workspaceId, principalId } = scope(session);
  await assertPrincipalInNode(client, principalId, nodeId);
  if (!workspaceId) throw Object.assign(new Error("WORKSPACE_SCOPE_REQUIRED"), { statusCode: 400 });

  const claimInWorkspace = (alias: string) => `(
    (${alias}.subject_type='cko' AND EXISTS(SELECT 1 FROM knowledge_objects sko WHERE sko.id=${alias}.subject_id AND sko.node_id=$1 AND sko.workspace_id=$2))
    OR EXISTS(SELECT 1 FROM claim_evidence sce JOIN fragments sf ON sf.id=sce.fragment_id JOIN knowledge_objects sko ON sko.id=sf.cko_id WHERE sce.claim_id=${alias}.id AND sko.node_id=$1 AND sko.workspace_id=$2)
  )`;

  const [
    objectCount, claimCount, contradictionCount, openHealthCount, agentCount,
    timeline, changes, claims, contradictions, decisions, sources, health, agents
  ] = await Promise.all([
    client.query(`SELECT count(*)::int AS count FROM knowledge_objects WHERE node_id=$1 AND workspace_id=$2 AND lifecycle_status<>'deleted'`, [nodeId, workspaceId]),
    client.query(`SELECT count(DISTINCT c.id)::int AS count FROM claims c WHERE c.node_id=$1 AND ${claimInWorkspace("c")}`, [nodeId, workspaceId]),
    client.query(`SELECT count(*)::int AS count FROM claim_conflicts cc JOIN claims a ON a.id=cc.claim_a_id JOIN claims b ON b.id=cc.claim_b_id WHERE cc.node_id=$1 AND ${claimInWorkspace("a")} AND ${claimInWorkspace("b")}`, [nodeId, workspaceId]),
    client.query(`SELECT count(*)::int AS count FROM knowledge_health_notifications WHERE node_id=$1 AND workspace_id=$2 AND resolved_at IS NULL`, [nodeId, workspaceId]),
    client.query(`SELECT count(DISTINCT ai.id)::int AS count FROM agent_identities ai JOIN agent_workspace_grants g ON g.agent_id=ai.id AND g.node_id=ai.node_id WHERE ai.node_id=$1 AND ai.enabled=true AND g.workspace_id=$2`, [nodeId, workspaceId]),

    client.query(`SELECT ke.id,ke.event_type,ke.subject_type,ke.subject_id,ke.cko_id,ke.summary,ke.confidence,ke.observed_at,ke.effective_at,
      coalesce((SELECT jsonb_agg(jsonb_build_object('type',kei.impacted_type,'id',kei.impacted_id,'kind',kei.impact_kind,'confidence',kei.confidence) ORDER BY kei.confidence DESC) FROM knowledge_event_impacts kei WHERE kei.event_id=ke.id),'[]'::jsonb) AS impacts
      FROM knowledge_events ke WHERE ke.node_id=$1 AND ke.workspace_id=$2 ORDER BY ke.observed_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT kd.id,kd.cko_id,ko.title,kd.summary,kd.diff_kind,kd.previous_version,kd.current_version,kd.confidence,kd.created_at,
      jsonb_array_length(kd.added) AS added_count,jsonb_array_length(kd.removed) AS removed_count,jsonb_array_length(kd.modified) AS modified_count
      FROM knowledge_diffs kd JOIN knowledge_objects ko ON ko.id=kd.cko_id AND ko.node_id=kd.node_id AND ko.workspace_id=kd.workspace_id
      WHERE kd.node_id=$1 AND kd.workspace_id=$2 ORDER BY kd.created_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT DISTINCT c.id,c.subject_type,c.subject_id,c.predicate,c.semantic_predicate,c.epistemic_status,c.temporal_status,c.confidence,c.valid_from,c.valid_until,c.created_at,
      coalesce(e.canonical_name,ko.title,c.subject_id::text) AS subject_label
      FROM claims c
      LEFT JOIN entities e ON e.id=c.semantic_subject_entity_id AND e.node_id=c.node_id
      LEFT JOIN knowledge_objects ko ON c.subject_type='cko' AND ko.id=c.subject_id AND ko.node_id=c.node_id
      WHERE c.node_id=$1 AND ${claimInWorkspace("c")}
      ORDER BY c.created_at DESC LIMIT 150`, [nodeId, workspaceId]),

    client.query(`SELECT cc.id,cc.conflict_type,cc.confidence,cc.details,cc.created_at,
      a.id AS claim_a_id,a.predicate AS claim_a_predicate,a.epistemic_status AS claim_a_status,
      b.id AS claim_b_id,b.predicate AS claim_b_predicate,b.epistemic_status AS claim_b_status
      FROM claim_conflicts cc JOIN claims a ON a.id=cc.claim_a_id JOIN claims b ON b.id=cc.claim_b_id
      WHERE cc.node_id=$1 AND ${claimInWorkspace("a")} AND ${claimInWorkspace("b")}
      ORDER BY cc.created_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT ko.id,ko.title,ko.summary,ko.updated_at,ko.created_at,
      coalesce((SELECT jsonb_agg(jsonb_build_object('event_type',ke.event_type,'summary',ke.summary,'observed_at',ke.observed_at,'confidence',ke.confidence) ORDER BY ke.observed_at DESC) FROM knowledge_events ke WHERE ke.node_id=ko.node_id AND ke.workspace_id=ko.workspace_id AND (ke.subject_id=ko.id OR ke.cko_id=ko.id) AND (ke.subject_type='decision' OR ke.event_type='DECISION_CHANGED')),'[]'::jsonb) AS events
      FROM knowledge_objects ko WHERE ko.node_id=$1 AND ko.workspace_id=$2 AND ko.lifecycle_status<>'deleted' AND lower(ko.type)='decision'
      ORDER BY ko.updated_at DESC,ko.created_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT sc.id,sc.provider,sc.account_email,sc.status,sc.last_error,sc.updated_at,
      count(ws.id)::int AS watched_count,
      count(*) FILTER (WHERE ws.status='fresh')::int AS fresh_count,
      count(*) FILTER (WHERE ws.status IN ('stale','error'))::int AS unhealthy_count,
      max(ws.last_success_at) AS last_success_at
      FROM source_connections sc LEFT JOIN watched_sources ws ON ws.connection_id=sc.id AND ws.node_id=sc.node_id AND ws.workspace_id=sc.workspace_id
      WHERE sc.node_id=$1 AND sc.workspace_id=$2
      GROUP BY sc.id ORDER BY sc.updated_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT id,watched_source_id,kind,severity,title,message,read_at,resolved_at,created_at FROM knowledge_health_notifications
      WHERE node_id=$1 AND workspace_id=$2 ORDER BY (resolved_at IS NULL) DESC,created_at DESC LIMIT 100`, [nodeId, workspaceId]),

    client.query(`SELECT DISTINCT ai.id,ai.name,ai.kind,ai.provider,ai.description,ai.capabilities,ai.enabled,ai.updated_at,g.workspace_id,g.permissions,
      (SELECT count(*)::int FROM agent_observations ao WHERE ao.agent_id=ai.id AND ao.node_id=$1 AND ao.workspace_id=$2) AS observation_count,
      (SELECT count(*)::int FROM agent_subscriptions s WHERE s.agent_id=ai.id AND s.node_id=$1 AND s.workspace_id=$2 AND s.enabled=true) AS subscription_count
      FROM agent_identities ai JOIN agent_workspace_grants g ON g.agent_id=ai.id AND g.node_id=ai.node_id
      WHERE ai.node_id=$1 AND g.workspace_id=$2 ORDER BY ai.enabled DESC,ai.name LIMIT 100`, [nodeId, workspaceId])
  ]);

  const sourceRows = sources.rows;
  const healthScore = Math.max(0, Math.min(100,
    100
    - Number(openHealthCount.rows[0]?.count ?? 0) * 8
    - sourceRows.reduce((sum, row) => sum + Number(row.unhealthy_count ?? 0) * 3, 0)
    - Number(contradictionCount.rows[0]?.count ?? 0) * 2
  ));

  return {
    generated_at: new Date().toISOString(),
    scope: { node_id: nodeId, workspace_id: workspaceId, principal_id: principalId },
    overview: {
      objects: Number(objectCount.rows[0]?.count ?? 0),
      claims: Number(claimCount.rows[0]?.count ?? 0),
      contradictions: Number(contradictionCount.rows[0]?.count ?? 0),
      open_health_issues: Number(openHealthCount.rows[0]?.count ?? 0),
      agents: Number(agentCount.rows[0]?.count ?? 0),
      sources: sourceRows.length,
      health_score: healthScore
    },
    timeline: timeline.rows,
    changes: changes.rows,
    claims: claims.rows,
    contradictions: contradictions.rows,
    decisions: decisions.rows,
    sources: sourceRows,
    health: health.rows,
    agents: agents.rows
  };
}
