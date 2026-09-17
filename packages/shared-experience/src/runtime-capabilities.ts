export type CervelDeploymentMode = "local" | "cloud" | "hybrid" | "staging" | "demo";
export type CervelRuntimeTransport = "local-node" | "cloud-api" | "hybrid";
export type CervelRecoveryState = "online" | "degraded" | "offline" | "recovering";

export interface CervelRuntimeCapabilities {
  mode: CervelDeploymentMode;
  transport: CervelRuntimeTransport;
  persistentKnowledge: true;
  localNode: boolean;
  cloudApi: boolean;
  offlineRead: boolean;
  offlineWriteQueue: boolean;
  recovery: boolean;
  demoSeedData: boolean;
  stagingDiagnostics: boolean;
}

const BASE = {
  persistentKnowledge: true as const,
  offlineRead: true,
  offlineWriteQueue: true,
  recovery: true,
};

export const CERVEL_RUNTIME_CAPABILITIES: Readonly<Record<CervelDeploymentMode, CervelRuntimeCapabilities>> = {
  local: { ...BASE, mode: "local", transport: "local-node", localNode: true, cloudApi: false, demoSeedData: false, stagingDiagnostics: false },
  cloud: { ...BASE, mode: "cloud", transport: "cloud-api", localNode: false, cloudApi: true, demoSeedData: false, stagingDiagnostics: false },
  hybrid: { ...BASE, mode: "hybrid", transport: "hybrid", localNode: true, cloudApi: true, demoSeedData: false, stagingDiagnostics: false },
  staging: { ...BASE, mode: "staging", transport: "cloud-api", localNode: false, cloudApi: true, demoSeedData: false, stagingDiagnostics: true },
  demo: { ...BASE, mode: "demo", transport: "cloud-api", localNode: false, cloudApi: true, demoSeedData: true, stagingDiagnostics: true },
};

export function capabilitiesForMode(mode: CervelDeploymentMode): CervelRuntimeCapabilities {
  return { ...CERVEL_RUNTIME_CAPABILITIES[mode] };
}

export function recoveryStateForRuntime(input: { online: boolean; apiReachable: boolean; recovering?: boolean }): CervelRecoveryState {
  if (input.recovering) return "recovering";
  if (!input.online) return "offline";
  if (!input.apiReachable) return "degraded";
  return "online";
}

export function assertRuntimeCapabilityBoundary(): void {
  for (const [mode, caps] of Object.entries(CERVEL_RUNTIME_CAPABILITIES) as [CervelDeploymentMode, CervelRuntimeCapabilities][]) {
    if (!caps.persistentKnowledge) throw new Error(`${mode} must preserve persistent knowledge`);
    if (!caps.recovery || !caps.offlineRead) throw new Error(`${mode} must expose the shared recovery contract`);
    if (mode === "demo" && !caps.demoSeedData) throw new Error("Demo mode must be explicit capability state");
    if (mode !== "demo" && caps.demoSeedData) throw new Error("Synthetic demo state must not leak into non-demo modes");
  }
}
