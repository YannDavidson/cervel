import { readFileSync } from "node:fs";

describe("PR #82 — Vault Explorer Convergence", () => {
  const runtime = readFileSync("apps/api/src/vault-explorer.ts", "utf8");
  const routes = readFileSync("apps/api/src/local-node-routes.ts", "utf8");
  const rust = readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs", "utf8");
  const ui = readFileSync("apps/desktop-tauri/ui/workspace.js", "utf8");
  const html = readFileSync("apps/desktop-tauri/ui/index.html", "utf8");

  test("Explorer navigation is backed by canonical persistent state", () => {
    expect(runtime).toContain("knowledge_objects");
    expect(runtime).toContain("corpus_cko_semantic_view");
    expect(runtime).toContain('title: "Notes"');
    expect(runtime).toContain('title: "Files"');
    expect(runtime).toContain('title: "Sources"');
    expect(runtime).toContain('navigation_source: "persistent-runtime-state"');
    expect(runtime).not.toMatch(/demo|synthetic/i);
  });

  test("semantic navigation preserves canonical identity and permission boundaries", () => {
    expect(runtime).toMatch(/count\(DISTINCT\s+(?:v\.)?cko_id\)/i);
    expect(runtime).toContain("enterprise_tenant_members");
    expect(runtime).toContain("life_sealed_access_sessions");
    expect(runtime).toContain('duplication_policy: "canonical-cko-references-only"');
    expect(runtime).toContain("v.cko_id=ko.id");
  });

  test("Activity and Properties are actual provenance and CKO state", () => {
    expect(runtime).toContain("provenance_events");
    expect(runtime).toContain("provenance_io");
    expect(runtime).toContain("cko_versions");
    expect(runtime).toContain('activity_source: "provenance-events"');
    expect(runtime).toContain('properties_source: "canonical-cko-state"');
    expect(runtime).toContain("lifecycle_status");
    expect(runtime).toContain("object_version");
  });

  test("Desktop keeps Local Node credentials behind the native bridge", () => {
    for (const command of ["vault_catalog", "vault_explorer", "vault_explorer_objects", "vault_explorer_object"]) expect(rust).toContain(command);
    expect(rust).toContain("x-cervel-local-token");
    expect(ui).not.toContain("x-cervel-local-token");
    expect(ui).not.toContain("desktop-session.json");
    expect(ui).toContain("vault_explorer_object");
  });

  test("richer Explorer exposes real Vaults, semantic navigation, Activity and Properties", () => {
    for (const marker of ["vault-catalog", "explorer-collections", "explorer-semantic", "inspector-activity", "inspector-properties"]) expect(html).toContain(marker);
    expect(routes).toContain('/v1/local/explorer');
    expect(routes).toContain('/v1/local/explorer/objects/:id');
  });
});
