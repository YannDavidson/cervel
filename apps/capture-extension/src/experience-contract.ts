import { embodimentContract, surfacesForClient } from "../../../packages/shared-experience/src";

export const EXTENSION_EXPERIENCE = {
  client: "extension" as const,
  contract: embodimentContract("extension"),
  surfaces: surfacesForClient("extension"),
  popup: {
    purpose: "capture-and-context" as const,
    fullWorkspace: false,
    actions: ["capture-page", "capture-selection", "activate-context", "search", "ask"] as const,
  },
  capture: {
    page: "capture.admission",
    selection: "capture.admission",
    provenance: "trace.provenance",
  },
  contextActivation: {
    contract: "context.activation",
    permissionBoundary: "canonical-runtime" as const,
    carriesSourceProvenance: true,
  },
};

export function assertExtensionExperienceContract(): void {
  const surfaceIds = new Set(EXTENSION_EXPERIENCE.surfaces.map(surface => surface.id));
  for (const id of ["capture", "search", "ask"] as const) {
    if (!surfaceIds.has(id)) throw new Error(`Extension shared surface missing: ${id}`);
  }
  if (EXTENSION_EXPERIENCE.popup.fullWorkspace) throw new Error("Extension popup must stay focused rather than embedding the Desktop workspace");
  for (const input of ["page", "selection", "context"] as const) {
    if (!EXTENSION_EXPERIENCE.contract.inputKinds.includes(input)) throw new Error(`Extension input missing: ${input}`);
  }
  if (!EXTENSION_EXPERIENCE.contextActivation.carriesSourceProvenance) throw new Error("Extension context activation must preserve provenance");
}
