import { embodimentContract, surfacesForClient } from "../../../packages/shared-experience/src";

export const MOBILE_EXPERIENCE = {
  client: "mobile" as const,
  contract: embodimentContract("mobile"),
  surfaces: surfacesForClient("mobile"),
  navigation: ["capture", "search", "ask", "vault-explorer", "corpus"] as const,
  capture: {
    text: "capture.admission",
    voice: "capture.voice",
    camera: "capture.camera",
    share: "capture.share",
  },
  intelligence: {
    search: "retrieval.search",
    ask: "reasoning.ask",
  },
  provenance: {
    requiredForEveryCapture: true,
    sourceKinds: ["typed", "voice", "camera", "share"] as const,
  },
  presentation: "mobile-native" as const,
};

export function assertMobileExperienceContract(): void {
  const surfaceIds = new Set(MOBILE_EXPERIENCE.surfaces.map(surface => surface.id));
  for (const id of ["capture", "search", "ask"] as const) {
    if (!surfaceIds.has(id)) throw new Error(`Mobile shared surface missing: ${id}`);
  }
  if (!MOBILE_EXPERIENCE.contract.inputKinds.includes("voice") || !MOBILE_EXPERIENCE.contract.inputKinds.includes("camera")) {
    throw new Error("Mobile contract must preserve voice and camera capture");
  }
  if (!MOBILE_EXPERIENCE.provenance.requiredForEveryCapture) throw new Error("Mobile capture must preserve provenance");
  if (MOBILE_EXPERIENCE.contract.fullDesktopWorkspaceRequired) throw new Error("Mobile must not depend on the full Desktop workspace");
}
