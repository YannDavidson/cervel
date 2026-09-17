import type { CervelClient, CervelSurfaceId } from "./index";

export type CervelEmbodiment = "mobile" | "extension";
export type CervelInputKind = "text" | "voice" | "camera" | "share" | "page" | "selection" | "context";

export interface CervelEmbodimentContract {
  client: Extract<CervelClient, "mobile" | "extension">;
  shell: "shared-design-system";
  productWorkspace: "surface-specific";
  primarySurfaces: readonly CervelSurfaceId[];
  inputKinds: readonly CervelInputKind[];
  provenanceRequired: true;
  permissionBoundary: "canonical-runtime";
  fullDesktopWorkspaceRequired: false;
}

export const CERVEL_EMBODIMENT_CONTRACTS: Readonly<Record<CervelEmbodiment, CervelEmbodimentContract>> = {
  mobile: {
    client: "mobile",
    shell: "shared-design-system",
    productWorkspace: "surface-specific",
    primarySurfaces: ["capture", "search", "ask", "vault-explorer", "corpus"],
    inputKinds: ["text", "voice", "camera", "share"],
    provenanceRequired: true,
    permissionBoundary: "canonical-runtime",
    fullDesktopWorkspaceRequired: false,
  },
  extension: {
    client: "extension",
    shell: "shared-design-system",
    productWorkspace: "surface-specific",
    primarySurfaces: ["capture", "search", "ask"],
    inputKinds: ["page", "selection", "context"],
    provenanceRequired: true,
    permissionBoundary: "canonical-runtime",
    fullDesktopWorkspaceRequired: false,
  },
};

export function embodimentContract(client: CervelEmbodiment): CervelEmbodimentContract {
  return CERVEL_EMBODIMENT_CONTRACTS[client];
}

export function assertEmbodimentBoundaries(): void {
  const mobile = embodimentContract("mobile");
  const extension = embodimentContract("extension");
  if (!mobile.inputKinds.includes("voice") || !mobile.inputKinds.includes("camera")) throw new Error("Mobile must own voice and camera capture affordances");
  if (!mobile.primarySurfaces.includes("search") || !mobile.primarySurfaces.includes("ask")) throw new Error("Mobile must expose Search and Ask CERVEL");
  if (!extension.inputKinds.includes("page") || !extension.inputKinds.includes("selection") || !extension.inputKinds.includes("context")) throw new Error("Extension must support page, selection, and context activation");
  if (extension.fullDesktopWorkspaceRequired) throw new Error("Extension popup must not require the full Desktop workspace");
  if (!mobile.provenanceRequired || !extension.provenanceRequired) throw new Error("All embodiment capture paths must preserve provenance");
}
