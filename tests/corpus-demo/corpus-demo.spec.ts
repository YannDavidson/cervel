import { demoApp, demoCss } from "../../apps/api/src/demo-assets";

describe("CERVEL Life + Enterprise Corpus Demo Experience", () => {
  test("offers dual-corpus onboarding and a persistent switcher", () => {
    for (const feature of [
      "CERVEL CORPUS EXPERIENCE",
      'data-onboard="life"',
      'data-onboard="enterprise"',
      'data-corpus="life"',
      'data-corpus="enterprise"',
      "CORPUS_VIEW_SWITCHED",
    ]) expect(demoApp).toContain(feature);
    expect(demoApp.indexOf("VAULT EXPLORER")).toBeLessThan(demoApp.indexOf('class="corpus-switch explorer-switch"'));
  });

  test("represents the complete reference taxonomies", () => {
    expect(demoApp).toContain("Relationships & Family");
    expect(demoApp).toContain("Legal / Administrative");
    expect(demoApp).toContain("Institutional Knowledge");
    expect(demoApp).toContain("Legal / Risk / Compliance");
    expect(demoApp).toContain("External Ecosystem");
    expect(demoApp).toContain("17 human-centered branches");
    expect(demoApp).toContain("18 tenant-aware");
  });

  test("makes privacy, tenant, scope, and authority visible and interactive", () => {
    for (const feature of [
      "privacy-select",
      "tenant-select",
      "scope-select",
      "Private · local only",
      "Sealed · unlock required",
      "CERVEL Inc.",
      "Product · Semantic Platform",
      "Authority · role gated",
      "Inferred · target Approved",
    ]) expect(demoApp + demoCss).toContain(feature);
  });

  test("renders retractable Mega Tabs and subtabs instead of legacy folders", () => {
    for (const feature of [
      "lifeTaxonomy",
      "enterpriseTaxonomy",
      "data-collapse",
      "data-subcollapse",
      "subtab-row",
      "MEGA TABS · SEMANTIC VIEWS",
      "Medical Records",
      "Identity Documents",
      "Legal / Risk / Compliance",
      "Retrospectives",
    ]) expect(demoApp + demoCss).toContain(feature);
    expect(demoApp).not.toContain("var folders=['Inbox'");
  });

  test("auto-classifies new and archived knowledge into corpus coordinates", () => {
    for (const feature of [
      "classifyContent",
      "membershipFor",
      "fileKnowledge",
      "KNOWLEDGE_AUTO_FILED",
      "knowledge-composer",
      "Add & auto-file",
      "data-archive-result",
      "Archive + auto-file",
      "suggested ",
    ]) expect(demoApp).toContain(feature);
  });

  test("demonstrates semantic multi-membership without CKO duplication", () => {
    for (const feature of [
      "One object, multiple meanings",
      "Canonical CKO",
      "Life · Projects",
      "Enterprise · Projects · Approved target",
      "Cross-Corpus Knowledge Graph",
      "0 duplicates",
      "content stored once",
    ]) expect(demoApp).toContain(feature);
  });

  test("ships a guided investor path and responsive polished surfaces", () => {
    for (const feature of [
      "investor path",
      "investor-tour",
      "INVESTOR_DEMO_STARTED",
      "Open the user-owned Vault",
      "Verify the complete Trace",
      "Explore shared knowledge",
    ]) expect(demoApp).toContain(feature);
    expect(demoCss).toContain(".onboarding-card");
    expect(demoCss).toContain("backdrop-filter:blur(18px)");
    expect(demoCss).toContain("@media(max-width:720px)");
  });

  test("remains valid standalone browser JavaScript", () => {
    expect(() => new Function(demoApp)).not.toThrow();
  });
});
