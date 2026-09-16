import {
  CERVEL_EXPERIENCE_SURFACES,
  CERVEL_PRIMARY_NAVIGATION,
  assertSharedExperienceBoundary,
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
