export type RuntimeCorpusViewKey = "life" | "enterprise";

export type SemanticMembership = {
  corpus_id: string;
  corpus_key: string;
  mega_tab: string;
  tab: string;
  subtab: string;
  membership_source: string;
  confidence: number;
  reasons: unknown;
  branch_sensitivity?: string | null;
  branch_visibility?: string | null;
  enterprise_tenant_id?: string | null;
  enterprise_scope_id?: string | null;
  authority_status?: string | null;
  authority_metadata?: unknown;
};

export type CanonicalCorpusObject = {
  cko_id: string;
  cko_type: string;
  cko_title: string;
  cko_summary?: string | null;
  lifecycle_status: string;
  object_version: number;
  cko_updated_at: string;
  memberships: SemanticMembership[];
};

export function runtimeCorpusViewKey(value: unknown): RuntimeCorpusViewKey {
  if (value === "life" || value === "enterprise") return value;
  throw Object.assign(new Error("CORPUS_RUNTIME_VIEW_INVALID"), { statusCode: 400 });
}

export function collapseSemanticCorpusRows(rows: any[]): CanonicalCorpusObject[] {
  const byCko = new Map<string, CanonicalCorpusObject>();
  for (const row of rows) {
    const id = String(row.cko_id ?? "");
    if (!id) throw new Error("CORPUS_RUNTIME_CKO_ID_REQUIRED");
    let object = byCko.get(id);
    if (!object) {
      object = {
        cko_id: id,
        cko_type: row.cko_type,
        cko_title: row.cko_title,
        cko_summary: row.cko_summary ?? null,
        lifecycle_status: row.lifecycle_status,
        object_version: Number(row.object_version ?? 0),
        cko_updated_at: row.cko_updated_at,
        memberships: []
      };
      byCko.set(id, object);
    }
    object.memberships.push({
      corpus_id: row.corpus_id,
      corpus_key: row.corpus_key,
      mega_tab: row.mega_tab,
      tab: row.tab,
      subtab: row.subtab ?? "",
      membership_source: row.membership_source,
      confidence: Number(row.confidence ?? 0),
      reasons: row.reasons,
      branch_sensitivity: row.branch_sensitivity ?? null,
      branch_visibility: row.branch_visibility ?? null,
      enterprise_tenant_id: row.enterprise_tenant_id ?? null,
      enterprise_scope_id: row.enterprise_scope_id ?? null,
      authority_status: row.authority_status ?? null,
      authority_metadata: row.authority_metadata ?? null
    });
  }
  return [...byCko.values()];
}

export function corpusRuntimeEnvelope(view: RuntimeCorpusViewKey, rows: any[]) {
  const objects = collapseSemanticCorpusRows(rows);
  return {
    view,
    canonical_objects: objects,
    canonical_cko_count: objects.length,
    membership_count: objects.reduce((sum, object) => sum + object.memberships.length, 0),
    duplication_policy: "canonical-cko-references-only" as const
  };
}
