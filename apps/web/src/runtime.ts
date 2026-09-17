import {
  CERVEL_EXPERIENCE_SURFACES,
  capabilitiesForMode,
  recoveryStateForRuntime,
  surfacesForClient,
  type CervelDeploymentMode,
  type CervelRecoveryState,
  type CervelRuntimeCapabilities,
} from "../../../packages/shared-experience/src";

export interface WebRuntimeEnvironment {
  mode?: string;
  online?: boolean;
  apiReachable?: boolean;
  recovering?: boolean;
}

export interface WebRuntimeDescriptor {
  client: "web";
  mode: CervelDeploymentMode;
  capabilities: CervelRuntimeCapabilities;
  recoveryState: CervelRecoveryState;
  surfaces: ReturnType<typeof surfacesForClient>;
  experienceContract: "shared-cervel-experience";
  productFork: false;
}

const MODES = new Set<CervelDeploymentMode>(["local", "cloud", "hybrid", "staging", "demo"]);

export function parseWebDeploymentMode(value?: string): CervelDeploymentMode {
  const normalized=(value??"cloud").trim().toLowerCase() as CervelDeploymentMode;
  if(!MODES.has(normalized)) throw new Error(`Unsupported CERVEL web deployment mode: ${value}`);
  return normalized;
}

export function describeWebRuntime(env: WebRuntimeEnvironment = {}): WebRuntimeDescriptor {
  const mode=parseWebDeploymentMode(env.mode);
  const online=env.online ?? true;
  const apiReachable=env.apiReachable ?? online;
  return {
    client:"web",
    mode,
    capabilities:capabilitiesForMode(mode),
    recoveryState:recoveryStateForRuntime({online,apiReachable,recovering:env.recovering}),
    surfaces:surfacesForClient("web"),
    experienceContract:"shared-cervel-experience",
    productFork:false,
  };
}

export function assertWebConvergenceBoundary(): void {
  const webIds=surfacesForClient("web").map(surface=>surface.id);
  const canonicalIds=CERVEL_EXPERIENCE_SURFACES.filter(surface=>surface.clients.includes("web")).map(surface=>surface.id);
  if(JSON.stringify(webIds)!==JSON.stringify(canonicalIds)) throw new Error("Web runtime must consume the canonical surface contract");
  for(const mode of MODES){
    const runtime=describeWebRuntime({mode});
    if(runtime.productFork) throw new Error(`${mode} must remain a runtime mode, not a product fork`);
    if(runtime.experienceContract!=="shared-cervel-experience") throw new Error(`${mode} must use the shared CERVEL experience`);
  }
}
