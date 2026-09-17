import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/alpha4-acceptance.yml", "utf8");
const protocol = readFileSync("scripts/alpha4-acceptance.ts", "utf8");
const docs = readFileSync("docs/ALPHA4_ACCEPTANCE_GATE.md", "utf8");

const required = [
  "clean_mac_install",
  "canonical_tauri",
  "local_lifecycle",
  "restart_persistence",
  "real_capture",
  "corpus_switching",
  "ask_citations_trace",
  "security_boundaries",
  "responsive_ui",
  "deployment_modes",
  "everywhere_continuity",
];

describe("CERVEL Everywhere Alpha.4 acceptance gate", () => {
  test("requires complete cross-surface evidence before automated qualification", () => {
    for (const check of required) {
      expect(protocol).toContain(`"${check}"`);
      expect(workflow).toContain(`--check ${check}`);
    }
    expect(protocol).toContain("Alpha.4 acceptance evidence missing");
    expect(protocol).toContain('automated_ci: "passed"');
    expect(protocol).toContain('signed_release_artifacts: "pending"');
    expect(protocol).toContain('physical_device_qualification: "pending"');
  });

  test("clean install evidence is Mac-specific and validates canonical Tauri", () => {
    expect(workflow).toContain("runs-on: macos-latest");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("cargo check --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml");
  });

  test("runtime acceptance exercises real encrypted lifecycle and knowledge paths", () => {
    expect(workflow).toContain("npm run cervel:setup");
    expect(workflow).toContain("npm run cervel:verify");
    expect(workflow).toContain("browser_capture.status");
    expect(workflow).toContain("cited_answer.status");
    expect(workflow).toContain("trace_complete.status");
    expect(workflow).toContain("tests/corpus-runtime");
    expect(workflow).toContain("scripts/everywhere-golden-path.ts");
  });

  test("security, responsive and deployment-mode acceptance remain first-class", () => {
    expect(workflow).toContain("tests/reasoning-boundary");
    expect(workflow).toContain("tests/intelligence-convergence");
    expect(workflow).toContain("tests/shared-experience");
    expect(workflow).toContain("tests/embodiment-contracts");
    expect(workflow).toContain("tests/web-convergence");
    expect(docs).toContain("One persistent knowledge substrate. One product language. Multiple embodiments.");
  });
});
