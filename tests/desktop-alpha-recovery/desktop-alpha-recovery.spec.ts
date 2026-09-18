import { readFileSync } from "node:fs";

const rust = readFileSync("apps/desktop-tauri/src-tauri/src/lib.rs","utf8");
const html = readFileSync("apps/desktop-tauri/ui/index.html","utf8");
const app = readFileSync("apps/desktop-tauri/ui/app.js","utf8");
const home = readFileSync("apps/desktop-tauri/ui/home-experience.js","utf8");
const workspace = readFileSync("apps/desktop-tauri/ui/workspace.js","utf8");
const intelligence = readFileSync("apps/desktop-tauri/ui/intelligence.js","utf8");
const css = readFileSync("apps/desktop-tauri/ui/visual-convergence.css","utf8");

describe("Desktop Alpha functional recovery",()=>{
  test("accepts canonical camelCase bootstrap identity without weakening API payloads",()=>{
    expect(rust).toContain('#[serde(rename_all="camelCase")]');
    expect(rust).toContain('struct Bootstrap { node_id: String, workspace_id: String, principal_id: String, storage_location_id: String }');
    expect(rust).toContain('"node_id":boot.node_id');
    expect(rust).toContain('"workspace_id":boot.workspace_id');
  });

  test("simplifies CERVEL branding and keeps the hero corpus-aware",()=>{
    expect(html).toContain('<strong>CERVEL</strong></div></div>');
    expect(html).not.toContain('<span>Sovereign Knowledge</span>');
    expect(html).toContain('id="home-hero-title"');
    expect(html).toContain('id="home-hero-description"');
    expect(home).toContain("Enterprise Corpus");
    expect(home).toContain("Your organization, remembered");
    expect(home).toContain("cervel:corpus-change");
  });

  test("wires a persistent appearance toggle with real dark presentation",()=>{
    expect(html).toContain('id="appearance-toggle"');
    expect(app).toContain("function applyTheme(theme)");
    expect(app).toContain("localStorage.setItem(THEME_KEY,value)");
    expect(css).toContain('html[data-theme="dark"]');
  });

  test("capture, explorer and graph surfaces replace raw bridge failures with recovery UX",()=>{
    expect(workspace).toContain("friendlyWorkspaceError");
    expect(workspace).toContain("Retry save");
    expect(workspace).toContain("Capture failed · nothing was changed");
    expect(intelligence).toContain("friendlyIntelligenceError");
    expect(intelligence).not.toContain('intelligenceEsc(error)</div>');
  });

  test("semantic Home cards open the real Vault Explorer context",()=>{
    expect(home).toContain("openSemanticView");
    expect(workspace).toContain("async function openSemanticView");
    expect(workspace).toContain("async function openCorpus");
  });
});
