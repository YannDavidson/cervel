import { corpusRuntimeEnvelope, runtimeCorpusViewKey } from "../../apps/api/src/corpus-runtime-view";
import { readFileSync } from "node:fs";

describe("PR #80 — Corpus Runtime: Life / Enterprise", () => {
  const base = {
    corpus_id: "corpus-life",
    corpus_key: "life",
    cko_id: "cko-1",
    cko_type: "note",
    cko_title: "Canonical object",
    cko_summary: "One object, many semantic memberships",
    lifecycle_status: "active",
    object_version: 3,
    cko_updated_at: "2026-09-17T00:00:00Z",
    membership_source: "automatic",
    confidence: 0.9,
    reasons: ["classification"],
    branch_sensitivity: "internal",
    branch_visibility: "private",
    enterprise_tenant_id: null,
    enterprise_scope_id: null,
    authority_status: "reported",
    authority_metadata: {}
  };

  test("accepts only Life and Enterprise as first-party runtime views", () => {
    expect(runtimeCorpusViewKey("life")).toBe("life");
    expect(runtimeCorpusViewKey("enterprise")).toBe("enterprise");
    expect(() => runtimeCorpusViewKey("demo")).toThrow("CORPUS_RUNTIME_VIEW_INVALID");
  });

  test("multiple memberships never duplicate a canonical CKO in one view", () => {
    const envelope = corpusRuntimeEnvelope("life", [
      { ...base, mega_tab: "projects", tab: "overview", subtab: "" },
      { ...base, mega_tab: "memory", tab: "overview", subtab: "" }
    ]);
    expect(envelope.canonical_cko_count).toBe(1);
    expect(envelope.membership_count).toBe(2);
    expect(envelope.canonical_objects).toHaveLength(1);
    expect(envelope.canonical_objects[0].cko_id).toBe("cko-1");
    expect(envelope.canonical_objects[0].memberships).toHaveLength(2);
    expect(envelope.duplication_policy).toBe("canonical-cko-references-only");
  });

  test("switching Life to Enterprise preserves canonical identity instead of copying knowledge", () => {
    const life = corpusRuntimeEnvelope("life", [{ ...base, mega_tab: "projects", tab: "overview", subtab: "" }]);
    const enterprise = corpusRuntimeEnvelope("enterprise", [{ ...base, corpus_id: "corpus-enterprise", corpus_key: "enterprise", enterprise_tenant_id: "tenant-1", mega_tab: "products", tab: "overview", subtab: "" }]);
    expect(life.canonical_objects[0].cko_id).toBe(enterprise.canonical_objects[0].cko_id);
    expect(life.canonical_objects[0]).not.toBe(enterprise.canonical_objects[0]);
    expect(life.canonical_objects[0].memberships[0].corpus_key).toBe("life");
    expect(enterprise.canonical_objects[0].memberships[0].corpus_key).toBe("enterprise");
  });

  test("runtime switching is read-only and uses existing permission-aware corpus queries", () => {
    const routes = readFileSync("apps/api/src/corpus-routes.ts", "utf8");
    const engine = readFileSync("apps/api/src/corpus-engine.ts", "utf8");
    expect(routes).toContain('app.get("/v1/corpus-runtime/:view"');
    expect(routes).toContain("queryCorpusView");
    expect(routes).not.toMatch(/app\.(post|put|delete)\("\/v1\/corpus-runtime/);
    expect(engine).toContain("corpus_cko_semantic_view");
    expect(engine).toContain("enterprise_tenant_members");
    expect(engine).toContain("life_sealed_access_sessions");
  });

  test("runtime index does not leak unrestricted aggregate membership counts", () => {
    const routes = readFileSync("apps/api/src/corpus-routes.ts", "utf8");
    const runtimeIndex = routes.match(/app\.get\("\/v1\/corpus-runtime",[\s\S]*?app\.get\("\/v1\/corpus-runtime\/:view"/)?.[0] ?? "";
    expect(runtimeIndex).not.toContain("membership_count:Number(x.membership_count");
    expect(runtimeIndex).toContain('switch_semantics:"read-only-canonical-cko-projection"');
  });
});
