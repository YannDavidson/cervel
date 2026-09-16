import {
  CERVEL_APPLICATION_SHELL,
  CERVEL_BRAND,
  CERVEL_DESIGN_TOKENS,
  CERVEL_EXPERIENCE_SURFACES,
  CERVEL_PRIMARY_NAVIGATION,
  assertApplicationShellBoundary,
  assertSharedExperienceBoundary,
  resolveTheme,
  responsiveModeForWidth,
  surfacesForClient
} from "../../packages/shared-experience/src";

describe("PR #77 — Shared CERVEL Experience Foundation", () => {
  test("CERVEL capabilities are owned by the shared experience", () => {
    expect(() => assertSharedExperienceBoundary()).not.toThrow();
    for (const id of ["vault-explorer", "corpus", "capture", "ask", "search", "trace", "graph"]) {
      expect(CERVEL_EXPERIENCE_SURFACES.find((surface) => surface.id === id)?.owner).toBe("cervel");
      expect(CERVEL_PRIMARY_NAVIGATION).toContain(id);
    }
  });

  test("clients adapt shared capabilities without claiming universal native features", () => {
    expect(surfacesForClient("extension").map((surface) => surface.id)).toEqual(expect.arrayContaining(["capture", "ask", "search"]));
    expect(surfacesForClient("desktop").map((surface) => surface.id)).toEqual(expect.arrayContaining(["vault-explorer", "corpus", "trace", "graph"]));
  });

  test("synthetic demo behavior is not a shared product capability", () => {
    expect(CERVEL_EXPERIENCE_SURFACES.some((surface) => surface.owner === "demo")).toBe(false);
    expect(CERVEL_EXPERIENCE_SURFACES.map((surface) => surface.contract)).not.toEqual(expect.arrayContaining([
      "demo.reset", "demo.synthetic-state", "demo.investor-tour"
    ]));
  });
});

describe("PR #78 — Design System / Branding / Application Shell", () => {
  test("brand identity pins the approved local logo and forbids runtime hotlinking", () => {
    expect(CERVEL_BRAND.name).toBe("CERVEL");
    expect(CERVEL_BRAND.logo.source).toBe("https://i.postimg.cc/3JTRqdvz/Chat-GPT-Image-Aug-24-2026-04-48-31-PM.png");
    expect(CERVEL_BRAND.logo.asset).toBe("packages/shared-experience/assets/brand/cervel-logo.png");
    expect(CERVEL_BRAND.logo.sha256).toBe("18dc78ba39e85b0db6a27c107e86382f42f8e4d67f41e1a3afbadebbbaed0f13");
    expect(CERVEL_BRAND.logo.bytes).toBe(852781);
    expect(CERVEL_BRAND.logo.width).toBe(1254);
    expect(CERVEL_BRAND.logo.height).toBe(1254);
    expect(CERVEL_BRAND.logo.policy).toBe("vendored-no-runtime-hotlink");
    expect(() => assertApplicationShellBoundary()).not.toThrow();
  });

  test("design tokens provide typography spacing and light/dark themes", () => {
    expect(CERVEL_DESIGN_TOKENS.typography.sans).toContain("system-ui");
    expect(CERVEL_DESIGN_TOKENS.spacing[4]).toBe(16);
    expect(CERVEL_DESIGN_TOKENS.themes.light.canvas).not.toBe(CERVEL_DESIGN_TOKENS.themes.dark.canvas);
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  test("shell owns Vault Explorer search status and Activity/Properties structure", () => {
    expect(() => assertApplicationShellBoundary()).not.toThrow();
    expect(CERVEL_APPLICATION_SHELL.regions.sidebar.purpose).toContain("vault");
    expect(CERVEL_APPLICATION_SHELL.globalSearch.surface).toBe("search");
    expect(CERVEL_APPLICATION_SHELL.inspectorTabs).toEqual(["activity", "properties"]);
    expect(CERVEL_APPLICATION_SHELL.regions.statusbar.purpose).toContain("privacy");
  });

  test("responsive shell contracts are deterministic and reject invalid widths", () => {
    expect(responsiveModeForWidth(1440)).toBe("wide");
    expect(responsiveModeForWidth(900)).toBe("compact");
    expect(responsiveModeForWidth(390)).toBe("mobile");
    expect(() => responsiveModeForWidth(-1)).toThrow();
  });
});
