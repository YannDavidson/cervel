import type { PoolClient } from "pg";
import { querySemanticViews } from "./corpus-semantic-views";
import { ensureBuiltinCorpora } from "./corpus-engine";
import { BUILTIN_CORPUS_KEYS } from "../../../packages/corpus-engine/src";

const membershipVisibility = (principalParam: string) => `
  (v.branch_visibility<>'sealed' OR EXISTS(
    SELECT 1 FROM life_sealed_access_sessions s
     WHERE s.corpus_id=v.corpus_id
       AND s.principal_id=${principalParam}
       AND s.mega_tab=v.mega_tab
       AND s.subtab=v.subtab
       AND s.revoked_at IS NULL
       AND s.expires_at>now()
  ))
  AND (v.enterprise_tenant_id IS NULL OR EXISTS(
    SELECT 1 FROM enterprise_tenant_members etm
     WHERE etm.tenant_id=v.enterprise_tenant_id
       AND etm.principal_id=${principalParam}
  ))`;

async function assertWorkspace(client: PoolClient, nodeId: string, workspaceId: string) {
  const row = await client.query(`SELECT id,slug,name,created_at FROM workspaces WHERE id=$1 AND node_id=$2`, [workspaceId, nodeId]);
  if (row.rowCount !== 1) throw Object.assign(new Error("VAULT_EXPLORER_WORKSPACE_NOT_FOUND"), { statusCode: 404 });
  return row.rows[0];
}

export async function loadVaultExplorer(client: PoolClient, input: { nodeId: string; workspaceId: string; principalId: string }) {
  const workspace = await assertWorkspace(client, input.nodeId, input.workspaceId);
  await ensureBuiltinCorpora(client,{nodeId:input.nodeId,workspaceId:input.workspaceId,principalId:input.principalId});
  const [types, corpora, recent] = await Promise.all([
    client.query(
      `SELECT ko.type,count(*)::int AS canonical_cko_count
         FROM knowledge_objects ko
        WHERE ko.node_id=$1 AND ko.workspace_id=$2 AND ko.lifecycle_status<>'deleted'
        GROUP BY ko.type ORDER BY ko.type`,
      [input.nodeId, input.workspaceId]
    ),
    client.query(
      `SELECT corpus_key FROM corpus_definitions
        WHERE node_id=$1 AND workspace_id=$2 AND enabled=true AND built_in=true`,
      [input.nodeId, input.workspaceId]
    ),
    client.query(
      `SELECT DISTINCT pe.id,pe.event_type,pe.actor_type,pe.actor_principal_id,pe.source,pe.parameters,pe.occurred_at
         FROM provenance_events pe
         JOIN provenance_io pio ON pio.provenance_event_id=pe.id
        WHERE pe.node_id=$1
          AND EXISTS(
            SELECT 1 FROM knowledge_objects ko
             WHERE ko.node_id=$1 AND ko.workspace_id=$2 AND ko.lifecycle_status<>'deleted'
               AND (
                 (pio.resource_type IN ('cko','knowledge_object') AND pio.resource_id=ko.id)
                 OR (pio.resource_type='artifact' AND EXISTS(SELECT 1 FROM artifacts a WHERE a.id=pio.resource_id AND a.cko_id=ko.id))
                 OR (pio.resource_type='fragment' AND EXISTS(SELECT 1 FROM fragments f WHERE f.id=pio.resource_id AND f.cko_id=ko.id))
               )
          )
        ORDER BY pe.occurred_at DESC LIMIT 30`,
      [input.nodeId, input.workspaceId]
    )
  ]);

  const byType = new Map(types.rows.map((row: any) => [String(row.type), Number(row.canonical_cko_count ?? 0)]));
  const collections = [
    { key: "all", title: "All CKOs", object_type: null, canonical_cko_count: [...byType.values()].reduce((sum, count) => sum + count, 0) },
    { key: "notes", title: "Notes", object_type: "note", canonical_cko_count: byType.get("note") ?? 0 },
    { key: "files", title: "Files", object_type: "file", canonical_cko_count: byType.get("file") ?? 0 },
    { key: "sources", title: "Sources", object_type: "source", canonical_cko_count: byType.get("source") ?? 0 }
  ];

  const available = new Set(corpora.rows.map((row: any) => String(row.corpus_key)));
  const semantic_views: Record<string, unknown> = {};
  for (const view of BUILTIN_CORPUS_KEYS) {
    if (available.has(view)) semantic_views[view] = await querySemanticViews(client, { nodeId: input.nodeId, workspaceId: input.workspaceId, principalId: input.principalId, view });
  }

  return {
    workspace,
    collections,
    semantic_views,
    activity: recent.rows,
    navigation_source: "persistent-runtime-state" as const,
    duplication_policy: "canonical-cko-references-only" as const
  };
}

export async function listVaultExplorerObjects(client: PoolClient, input: {
  nodeId: string;
  workspaceId: string;
  principalId: string;
  query?: string;
  type?: string;
  corpusKey?: string;
  megaTab?: string;
  subtab?: string;
  limit?: number;
}) {
  await assertWorkspace(client, input.nodeId, input.workspaceId);
  const values: any[] = [input.nodeId, input.workspaceId, input.principalId];
  const where = [`ko.node_id=$1`, `ko.workspace_id=$2`, `ko.lifecycle_status<>'deleted'`];
  if (input.type) { values.push(input.type); where.push(`ko.type=$${values.length}`); }
  if (input.query?.trim()) { values.push(`%${input.query.trim()}%`); where.push(`(ko.title ILIKE $${values.length} OR coalesce(ko.summary,'') ILIKE $${values.length})`); }
  if (input.corpusKey || input.megaTab || input.subtab) {
    const corpusIndex = input.corpusKey ? (values.push(input.corpusKey), values.length) : null;
    const tabIndex = input.megaTab ? (values.push(input.megaTab), values.length) : null;
    const subtabIndex = input.subtab ? (values.push(input.subtab), values.length) : null;
    where.push(`EXISTS(
      SELECT 1 FROM corpus_cko_semantic_view v
       JOIN corpus_definitions cd ON cd.id=v.corpus_id
      WHERE v.cko_id=ko.id
        ${corpusIndex ? `AND v.corpus_key=$${corpusIndex}` : ""}
        ${tabIndex ? `AND v.mega_tab=$${tabIndex}` : ""}
        ${subtabIndex ? `AND v.subtab=$${subtabIndex}` : ""}
        AND (cd.visibility IN ('public','node') OR cd.owner_principal_id=$3 OR EXISTS(SELECT 1 FROM corpus_access_grants cag WHERE cag.corpus_id=cd.id AND cag.principal_id=$3))
        AND ${membershipVisibility("$3")}
    )`);
  }
  values.push(Math.max(1, Math.min(input.limit ?? 100, 200)));
  const limitIndex = values.length;
  const result = await client.query(
    `SELECT ko.id,ko.type,ko.title,ko.summary,ko.lifecycle_status,ko.epistemic_status,ko.confidence,ko.object_version,ko.created_at,ko.updated_at,
            count(DISTINCT a.id)::int AS artifact_count,count(DISTINCT f.id)::int AS fragment_count
       FROM knowledge_objects ko
       LEFT JOIN artifacts a ON a.cko_id=ko.id
       LEFT JOIN fragments f ON f.cko_id=ko.id
      WHERE ${where.join(" AND ")}
      GROUP BY ko.id
      ORDER BY ko.updated_at DESC,ko.created_at DESC LIMIT $${limitIndex}`,
    values
  );
  return { objects: result.rows, count_source: "persistent-knowledge-objects" as const };
}

export async function loadVaultExplorerObject(client: PoolClient, input: { nodeId: string; workspaceId: string; principalId: string; ckoId: string }) {
  await assertWorkspace(client, input.nodeId, input.workspaceId);
  const object = await client.query(
    `SELECT ko.*,
            (SELECT count(*)::int FROM artifacts a WHERE a.cko_id=ko.id) AS artifact_count,
            (SELECT count(*)::int FROM fragments f WHERE f.cko_id=ko.id) AS fragment_count,
            (SELECT count(*)::int FROM claims c JOIN claim_evidence ce ON ce.claim_id=c.id JOIN fragments f ON f.id=ce.fragment_id WHERE f.cko_id=ko.id) AS claim_count
       FROM knowledge_objects ko
      WHERE ko.id=$1 AND ko.node_id=$2 AND ko.workspace_id=$3 AND ko.lifecycle_status<>'deleted'`,
    [input.ckoId, input.nodeId, input.workspaceId]
  );
  if (object.rowCount !== 1) throw Object.assign(new Error("VAULT_EXPLORER_CKO_NOT_FOUND"), { statusCode: 404 });

  const [artifacts, memberships, provenance, versions] = await Promise.all([
    client.query(`SELECT id,role,mime_type,size_bytes,sha256,metadata,created_at FROM artifacts WHERE cko_id=$1 ORDER BY created_at DESC`, [input.ckoId]),
    client.query(
      `SELECT v.corpus_id,v.corpus_key,v.mega_tab,v.tab,v.subtab,v.membership_source,v.confidence,v.reasons,v.branch_sensitivity,v.branch_visibility,v.enterprise_tenant_id,v.enterprise_scope_id,v.authority_status,v.authority_metadata
         FROM corpus_cko_semantic_view v
         JOIN corpus_definitions cd ON cd.id=v.corpus_id
        WHERE v.cko_id=$1
          AND (cd.visibility IN ('public','node') OR cd.owner_principal_id=$2 OR EXISTS(SELECT 1 FROM corpus_access_grants cag WHERE cag.corpus_id=cd.id AND cag.principal_id=$2))
          AND ${membershipVisibility("$2")}
        ORDER BY v.corpus_key,v.mega_tab,v.tab,v.subtab`,
      [input.ckoId, input.principalId]
    ),
    client.query(
      `SELECT DISTINCT pe.id,pe.event_type,pe.actor_type,pe.actor_principal_id,pe.model_run_id,pe.source,pe.parameters,pe.occurred_at,
              pio.io_role,pio.resource_type,pio.resource_id,pio.sha256
         FROM provenance_events pe
         JOIN provenance_io pio ON pio.provenance_event_id=pe.id
        WHERE pe.node_id=$2 AND (
          (pio.resource_type IN ('cko','knowledge_object') AND pio.resource_id=$1)
          OR (pio.resource_type='artifact' AND EXISTS(SELECT 1 FROM artifacts a WHERE a.id=pio.resource_id AND a.cko_id=$1))
          OR (pio.resource_type='fragment' AND EXISTS(SELECT 1 FROM fragments f WHERE f.id=pio.resource_id AND f.cko_id=$1))
        )
        ORDER BY pe.occurred_at DESC LIMIT 80`,
      [input.ckoId, input.nodeId]
    ),
    client.query(`SELECT version,change_reason,changed_by,created_at FROM cko_versions WHERE cko_id=$1 ORDER BY version DESC LIMIT 25`, [input.ckoId])
  ]);

  return {
    object: object.rows[0],
    properties: {
      lifecycle_status: object.rows[0].lifecycle_status,
      epistemic_status: object.rows[0].epistemic_status,
      confidence: object.rows[0].confidence,
      object_version: object.rows[0].object_version,
      languages: object.rows[0].languages,
      jurisdictions: object.rows[0].jurisdictions,
      created_at: object.rows[0].created_at,
      updated_at: object.rows[0].updated_at,
      artifact_count: object.rows[0].artifact_count,
      fragment_count: object.rows[0].fragment_count,
      claim_count: object.rows[0].claim_count
    },
    artifacts: artifacts.rows,
    memberships: memberships.rows,
    activity: provenance.rows,
    versions: versions.rows,
    activity_source: "provenance-events" as const,
    properties_source: "canonical-cko-state" as const
  };
}
