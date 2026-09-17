import {
  assertEmbodimentBoundaries,
  embodimentContract,
  surfacesForClient,
} from "../../packages/shared-experience/src";
import { MOBILE_EXPERIENCE, assertMobileExperienceContract } from "../../apps/mobile/src/experience-contract";
import { EXTENSION_EXPERIENCE, assertExtensionExperienceContract } from "../../apps/capture-extension/src/experience-contract";

describe("mobile and extension experience contracts", () => {
  test("mobile shares product contracts but owns mobile-native inputs", () => {
    assertEmbodimentBoundaries();
    assertMobileExperienceContract();
    expect(MOBILE_EXPERIENCE.presentation).toBe("mobile-native");
    expect(MOBILE_EXPERIENCE.navigation).toEqual(["capture", "search", "ask", "vault-explorer", "corpus"]);
    expect(MOBILE_EXPERIENCE.contract.inputKinds).toEqual(expect.arrayContaining(["voice", "camera", "share"]));
    expect(MOBILE_EXPERIENCE.provenance.requiredForEveryCapture).toBe(true);
  });

  test("extension is focused on page/selection capture and context activation", () => {
    assertExtensionExperienceContract();
    expect(EXTENSION_EXPERIENCE.popup.fullWorkspace).toBe(false);
    expect(EXTENSION_EXPERIENCE.popup.actions).toEqual([
      "capture-page",
      "capture-selection",
      "activate-context",
      "search",
      "ask",
    ]);
    expect(EXTENSION_EXPERIENCE.contextActivation.carriesSourceProvenance).toBe(true);
  });

  test("extension does not inherit the full Desktop surface set", () => {
    const desktop = surfacesForClient("desktop").map(surface => surface.id);
    const extension = surfacesForClient("extension").map(surface => surface.id);
    expect(extension).toEqual(["capture", "ask", "search"]);
    expect(extension.length).toBeLessThan(desktop.length);
    expect(embodimentContract("extension").fullDesktopWorkspaceRequired).toBe(false);
  });

  test("shared ownership stays with canonical CERVEL contracts", () => {
    for (const client of ["mobile", "extension"] as const) {
      for (const surface of surfacesForClient(client)) expect(surface.owner).toBe("cervel");
    }
  });
});
