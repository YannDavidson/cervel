import { readFileSync } from "node:fs";
import { LIFE_BRANCHES } from "../../packages/life-corpus/src";
import { ENTERPRISE_BRANCHES } from "../../packages/enterprise-corpus/src";

const routes=readFileSync("apps/api/src/local-node-routes.ts","utf8");
const explorer=readFileSync("apps/api/src/vault-explorer.ts","utf8");
const rust=readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs","utf8");
const workspace=readFileSync("apps/desktop-tauri/ui/workspace.js","utf8");
const css=readFileSync("apps/desktop-tauri/ui/explorer.css","utf8");

describe("Navigable Corpus Workspace",()=>{
  test("ships every canonical Life and Enterprise branch with inner folders",()=>{
    expect(LIFE_BRANCHES).toHaveLength(17);
    expect(ENTERPRISE_BRANCHES).toHaveLength(18);
    expect(LIFE_BRANCHES.every(branch=>branch.subtabs.length>=5)).toBe(true);
    expect(ENTERPRISE_BRANCHES.every(branch=>branch.subtabs.length>=5)).toBe(true);
    expect(workspace).toContain("function corpusTree(view,key)");
    expect(workspace).toContain("corpus-subfolders");
    expect(workspace).toContain("data-subtab=");
  });

  test("folder navigation filters canonical CKOs without creating a second store",()=>{
    expect(explorer).toContain("subtab?: string");
    expect(explorer).toContain("AND v.mega_tab=$${tabIndex}");
    expect(explorer).toContain("AND v.subtab=$${subtabIndex}");
    expect(rust).toContain("&subtab=");
    expect(rust).toContain("vault_explorer_objects");
    expect(rust).not.toContain("corpus-folder-store");
    expect(workspace).toContain("subtab:explorerState.subtab");
  });

  test("supports direct capture into the current semantic folder",()=>{
    expect(routes).toContain('/v1/local/explorer/file');
    expect(routes).toContain("fileLifeCko");
    expect(routes).toContain("fileEnterpriseCko");
    expect(routes).toContain("ENTERPRISE_TENANT_CONTEXT_REQUIRED");
    expect(routes).toContain("CORPUS_FILE_KEY_INVALID");
    expect(rust).toContain("file_corpus_membership");
    expect(workspace).toContain("+ Add knowledge here");
    expect(workspace).toContain("fileCapturedObject");
    expect(workspace).toContain("semantic membership only");
  });

  test("preserves canonical capture if contextual filing fails",()=>{
    expect(workspace).toContain("Contextual corpus filing failed after canonical capture");
    expect(workspace).toContain("Saved to Vault · folder filing needs attention");
    expect(workspace).toContain("folder filing issue(s)");
  });

  test("returns captured ids so file imports can be filed contextually",()=>{
    expect(rust).toContain("captured_ids: Vec<String>");
    expect(rust).toContain("captured_ids.push(id)");
    expect(workspace).toContain("result.captured_ids||[]");
  });

  test("renders hierarchy as compact collapsible branches",()=>{
    expect(css).toContain(".corpus-root>summary");
    expect(css).toContain(".corpus-branch");
    expect(css).toContain(".corpus-subfolder");
    expect(css).toContain(".folder-toolbar");
  });
});
