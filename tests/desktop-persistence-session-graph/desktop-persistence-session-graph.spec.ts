import { readFileSync } from "node:fs";

const rust=readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs","utf8");
const app=readFileSync("apps/desktop-tauri/ui/app.js","utf8");
const workspace=readFileSync("apps/desktop-tauri/ui/workspace.js","utf8");
const intelligence=readFileSync("apps/desktop-tauri/ui/intelligence.js","utf8");
const visualCss=readFileSync("apps/desktop-tauri/ui/visual-convergence.css","utf8");
const graphCss=readFileSync("apps/desktop-tauri/ui/intelligence-convergence.css","utf8");

describe("Desktop persistence, session recovery, and graph UX",()=>{
  test("defaults to light appearance unless the user explicitly saved dark",()=>{
    expect(app).toContain("applyTheme(saved==='dark'?'dark':'light')");
    expect(app).not.toContain("prefers-color-scheme");
    expect(visualCss).toContain('html[data-theme="dark"] .home-hero h2');
    expect(visualCss).toContain('html[data-theme="dark"] #home-hero-description');
  });

  test("recovers exactly one valid active Vault runtime session after Desktop restart",()=>{
    expect(rust).toContain("fn recover_active_vault(runtime:&NodeRuntime)->Option<PathBuf>");
    expect(rust).toContain('runtime/desktop-session.json');
    expect(rust).toContain('runtime/bootstrap.json');
    expect(rust).toContain("if candidates.len()==1");
    expect(rust).toContain('/v1/local/overview');
    expect(rust).toContain('"x-cervel-local-token"');
    expect(rust).toContain('==Some(boot.node_id.as_str())');
    expect(rust).toContain("if let Some(vault)=recover_active_vault(runtime){return Ok(vault)}");
  });

  test("distinguishes Node running from Vault unlocked in the renderer",()=>{
    expect(app).toContain("Local Node · Vault unlocked");
    expect(app).toContain("Local Node · Vault locked");
    expect(app).toContain("Healthy · Vault unlocked");
  });

  test("capture refresh resets hidden filters and reloads Explorer plus Activity",()=>{
    expect(workspace).toContain("function resetExplorerToAll()");
    expect(workspace).toContain("async function refreshKnowledgeSurfaces");
    expect(workspace).toContain("await loadExplorer()");
    expect(workspace).toContain("await loadVault(");
    expect(workspace).toContain("await window.CERVEL_HOME?.loadHome?.()");
    const resets=(workspace.match(/refreshKnowledgeSurfaces\(\{reset:true\}\)/g)||[]).length;
    expect(resets).toBeGreaterThanOrEqual(3);
    expect(workspace).toContain("document.querySelector('[data-view=\"vault\"]')?.addEventListener('click'");
  });

  test("graph labels are sanitized, bounded, and never use raw JSON as primary cards",()=>{
    expect(intelligence).toContain("function graphDisplayText(value,max=44)");
    expect(intelligence).toContain("JSON.parse(text)");
    expect(intelligence).toContain("text.length>max");
    expect(intelligence).toContain("function graphNodeLabel(node)");
    expect(intelligence).not.toContain("intelligenceEsc(node.label||node.id)");
    expect(graphCss).toContain("-webkit-line-clamp:2");
    expect(graphCss).toContain("max-height:76px");
  });

  test("graph renders visual relationships and inspector-driven details",()=>{
    expect(intelligence).toContain('class="graph-links"');
    expect(intelligence).toContain('data-edge-line=');
    expect(intelligence).toContain('data-entity-index=');
    expect(intelligence).toContain("Select a node or relationship to inspect its evidence.");
    expect(intelligence).toContain("Open evidence CKO");
  });
});
