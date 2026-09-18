import { readFileSync } from "node:fs";

const html = readFileSync("apps/desktop-tauri/ui/index.html", "utf8");
const css = readFileSync("apps/desktop-tauri/ui/visual-convergence.css", "utf8");
const home = readFileSync("apps/desktop-tauri/ui/home-experience.js", "utf8");
const prep = readFileSync("scripts/prepare-tauri-ui.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

describe("canonical CERVEL Desktop visual convergence", () => {
  test("uses the approved vendored brand asset instead of a runtime hotlink", () => {
    expect(html).toContain('src="brand/cervel-logo.png"');
    expect(prep).toContain("packages/shared-experience/assets/brand/cervel-logo.png");
    expect(prep).toContain("apps/desktop-tauri/ui/brand/cervel-logo.png");
    expect(html).not.toContain("postimg.cc");
    expect(pkg).toContain('"prepare:desktop:ui"');
    expect(pkg).toContain("npm run prepare:desktop:ui && npm run build");
  });

  test("renders the reference product language without synthetic demo state", () => {
    expect(html).toContain("Your life, remembered");
    expect(html).not.toContain("<span>Sovereign Knowledge</span>");
    expect(html).toContain("<strong>CERVEL</strong>");
    expect(html).toContain("Vault Explorer");
    expect(html).toContain("Ask CERVEL");
    expect(html).toContain("Local Node");
    expect(html.toLowerCase()).not.toContain("synthetic demo");
  });

  test("home surfaces are backed by real native runtime state", () => {
    expect(home).toContain("homeInvoke('node_status')");
    expect(home).toContain("homeInvoke('vault_explorer')");
    expect(home).toContain("semantic_views");
    expect(home).toContain("explorer?.activity");
    expect(home).not.toContain("Math.random");
  });

  test("keeps Apple-style responsive shell concerns presentation-only", () => {
    expect(css).toContain("backdrop-filter:blur(26px)");
    expect(css).toContain("grid-template-columns:minmax(0,1fr) 330px");
    expect(css).toContain("@media(max-width:1100px)");
    expect(css).toContain("--cv-sidebar:#07110f");
    expect(css).toContain("--cv-mint:#6de7c5");
  });
});
