export type CervelSurfaceId =
  | "home"
  | "vault-explorer"
  | "corpus"
  | "capture"
  | "ask"
  | "search"
  | "trace"
  | "graph"
  | "activity"
  | "properties"
  | "deliverables"
  | "connections";

export type CervelClient = "desktop" | "web" | "mobile" | "extension";
export type CervelCapabilityOwner = "cervel" | "client" | "demo";

export interface CervelExperienceSurface {
  id: CervelSurfaceId;
  label: string;
  owner: CervelCapabilityOwner;
  clients: readonly CervelClient[];
  contract: string;
}

export const CERVEL_EXPERIENCE_SURFACES: readonly CervelExperienceSurface[] = [
  { id: "home", label: "Home", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "workspace.home" },
  { id: "vault-explorer", label: "Vault Explorer", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "vault.explorer" },
  { id: "corpus", label: "Corpus", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "corpus.semantic-views" },
  { id: "capture", label: "Add knowledge", owner: "cervel", clients: ["desktop", "web", "mobile", "extension"], contract: "capture.admission" },
  { id: "ask", label: "Ask CERVEL", owner: "cervel", clients: ["desktop", "web", "mobile", "extension"], contract: "reasoning.ask" },
  { id: "search", label: "Search", owner: "cervel", clients: ["desktop", "web", "mobile", "extension"], contract: "retrieval.search" },
  { id: "trace", label: "Trace", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "trace.provenance" },
  { id: "graph", label: "Graph", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "knowledge.graph" },
  { id: "activity", label: "Activity", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "knowledge.activity" },
  { id: "properties", label: "Properties", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "knowledge.properties" },
  { id: "deliverables", label: "Deliverables", owner: "cervel", clients: ["desktop", "web", "mobile"], contract: "deliverables.render" },
  { id: "connections", label: "Connections", owner: "cervel", clients: ["desktop", "web"], contract: "connections.gateway" }
] as const;

export const CERVEL_PRIMARY_NAVIGATION: readonly CervelSurfaceId[] = [
  "home", "vault-explorer", "corpus", "capture", "ask", "search", "trace", "graph"
] as const;

export const CERVEL_EXPERIENCE_TOKENS = {
  layout: { sidebar: "experience.sidebar", workspace: "experience.workspace", inspector: "experience.inspector" },
  state: { healthy: "state.healthy", warning: "state.warning", private: "state.private", sealed: "state.sealed" },
  density: { compact: "density.compact", comfortable: "density.comfortable" }
} as const;

export function surfacesForClient(client: CervelClient): CervelExperienceSurface[] {
  return CERVEL_EXPERIENCE_SURFACES.filter((surface) => surface.clients.includes(client));
}

export function assertSharedExperienceBoundary(): void {
  const required: CervelSurfaceId[] = ["vault-explorer", "corpus", "capture", "ask", "search", "trace", "graph"];
  for (const id of required) {
    const surface = CERVEL_EXPERIENCE_SURFACES.find((candidate) => candidate.id === id);
    if (!surface || surface.owner !== "cervel") throw new Error(`Shared CERVEL capability missing: ${id}`);
  }
}
