import { readFileSync } from "node:fs";

describe("PR #83 — Ask / Search / Trace / Graph Convergence", () => {
  const rust = readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs", "utf8");
  const routes = readFileSync("apps/api/src/local-node-routes.ts", "utf8");
  const ui = readFileSync("apps/desktop-tauri/ui/intelligence.js", "utf8");
  const html = readFileSync("apps/desktop-tauri/ui/index.html", "utf8");

  test("Search and Ask stay on canonical permission-aware runtime routes", () => {
    expect(rust).toContain("search_cervel");
    expect(rust).toContain('"/v1/search"');
    expect(rust).toContain("ask_cervel");
    expect(rust).toContain('"/v1/reason"');
    expect(rust).toContain('"workspace_id":boot.workspace_id');
    expect(ui).not.toContain("x-cervel-local-token");
    expect(ui).not.toContain("desktop-session.json");
  });

  test("Trace remains protected answer lineage and bridges back to source CKOs", () => {
    expect(rust).toContain("answer_trace");
    expect(rust).toContain('/v1/answers/{id}/trace');
    expect(ui).toContain("citationEvidence");
    expect(ui).toContain("data-trace-cko");
    expect(ui).toContain("artifact.sha256");
    expect(ui).toContain("intelligenceEsc");
  });

  test("Graph projection is workspace and retrieval-policy scoped", () => {
    expect(routes).toContain('resolveRetrievalScope');
    expect(routes).toContain('ko.workspace_id=$2');
    expect(routes).toContain('scope.allowedCkoIds');
    expect(routes).toContain('claim_evidence');
    expect(routes).toContain('evidence_fragment_id');
    expect(routes).toContain('source_cko_id');
    expect(routes).toContain('projection_source:"permission-aware-claim-evidence"');
    expect(rust).toContain("knowledge_graph");
    expect(rust).toContain("workspace_id={}");
  });

  test("Shared experience exposes real Search, evidence, Trace and Graph surfaces", () => {
    for (const marker of ["search-results", "cortex-answer", "trace-current", "graph-canvas", "graph-edge-detail"]) expect(html).toContain(marker);
    for (const command of ["search_cervel", "ask_cervel", "answer_trace", "knowledge_graph"]) expect(ui).toContain(command);
    expect(ui).toContain("AUTHORIZED EVIDENCE");
    expect(ui).toContain("permission-aware hybrid retrieval");
  });
});
