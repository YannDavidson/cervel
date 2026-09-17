import { readFileSync } from "node:fs";
import { LIFE_BRANCHES } from "../../packages/life-corpus/src";
import { ENTERPRISE_BRANCHES } from "../../packages/enterprise-corpus/src";
import { projectSemanticViews } from "../../apps/api/src/corpus-semantic-views";

describe("PR #81 — Mega Tabs / Semantic Views", () => {
  test("Life semantic views come from the persistent taxonomy contract", () => {
    expect(LIFE_BRANCHES.map(x => x.title)).toEqual([
      "Personal",
      "Relationships & Family",
      "Health",
      "Work & Career",
      "Education",
      "Projects",
      "Finance",
      "Home",
      "Memory",
      "Personal Knowledge",
      "Digital Life",
      "Travel",
      "Hobbies",
      "Goals",
      "Civic / Community",
      "Legal / Administrative",
      "Legacy"
    ]);
  });

  test("Enterprise semantic views remain first-party taxonomy definitions", () => {
    expect(ENTERPRISE_BRANCHES.length).toBeGreaterThan(10);
    expect(ENTERPRISE_BRANCHES.map(x => x.key)).toContain("organization");
    expect(ENTERPRISE_BRANCHES.map(x => x.key)).toContain("projects");
    expect(ENTERPRISE_BRANCHES.map(x => x.key)).toContain("ai-agents");
  });

  test("projects real membership counts onto taxonomy nodes including empty views", () => {
    const taxonomy = [
      { key: "personal", title: "Personal", tabs: [{ key: "overview" }] },
      { key: "projects", title: "Projects", tabs: [{ key: "overview" }] },
      { key: "finance", title: "Finance", tabs: [{ key: "overview" }] }
    ];
    const result = projectSemanticViews(taxonomy, [
      { mega_tab: "projects", canonical_cko_count: 4, membership_count: 6, latest_cko_updated_at: "2026-09-17T00:00:00Z" },
      { mega_tab: "finance", canonical_cko_count: 2, membership_count: 2, latest_cko_updated_at: null }
    ]);
    expect(result).toEqual([
      { key: "personal", title: "Personal", tabs: [{ key: "overview" }], canonical_cko_count: 0, membership_count: 0, latest_cko_updated_at: null },
      { key: "projects", title: "Projects", tabs: [{ key: "overview" }], canonical_cko_count: 4, membership_count: 6, latest_cko_updated_at: "2026-09-17T00:00:00Z" },
      { key: "finance", title: "Finance", tabs: [{ key: "overview" }], canonical_cko_count: 2, membership_count: 2, latest_cko_updated_at: null }
    ]);
  });

  test("runtime counts are derived from persistent permission-filtered memberships, never demo constants", () => {
    const source = readFileSync("apps/api/src/corpus-semantic-views.ts", "utf8");
    const routes = readFileSync("apps/api/src/corpus-routes.ts", "utf8");
    expect(source).toContain("corpus_cko_semantic_view");
    expect(source).toContain("count(DISTINCT v.cko_id)");
    expect(source).toContain("count(*)");
    expect(source).toContain("life_sealed_access_sessions");
    expect(source).toContain("enterprise_tenant_members");
    expect(source).toContain('count_source: "persistent-corpus-memberships"');
    expect(routes).toContain('/v1/corpus-runtime/:view/semantic-views');
    expect(routes).not.toMatch(/semantic-views[^\n]*(demo|fixture|synthetic)/i);
  });
});
