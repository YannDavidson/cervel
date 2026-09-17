export * from "./runtime-capabilities";
export * from "./embodiment-contracts";

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
export type CervelTheme = "light" | "dark" | "system";
export type CervelResponsiveMode = "wide" | "compact" | "mobile";
export type CervelStatusTone = "healthy" | "warning" | "offline" | "private" | "sealed";

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

/** Canonical CERVEL brand identity. Source is provenance only; runtime uses the pinned vendored asset. */
export const CERVEL_BRAND = {
  name: "CERVEL",
  descriptor: "Sovereign Knowledge",
  thesis: "Persistent Knowledge Infrastructure for humans, AI, and machines. Sovereign by design.",
  logo: {
    asset: "packages/shared-experience/assets/brand/cervel-logo.png",
    sha256: "18dc78ba39e85b0db6a27c107e86382f42f8e4d67f41e1a3afbadebbbaed0f13",
    bytes: 852781,
    width: 1254,
    height: 1254,
    source: "https://i.postimg.cc/3JTRqdvz/Chat-GPT-Image-Aug-24-2026-04-48-31-PM.png",
    policy: "vendored-no-runtime-hotlink"
  }
} as const;

export const CERVEL_DESIGN_TOKENS = {
  typography: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    scale: { xs: 12, sm: 13, md: 15, lg: 18, xl: 24, display: 36 }
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  themes: {
    light: { canvas: "#f6f7f8", surface: "#ffffff", elevated: "#ffffff", text: "#17201d", muted: "#68716d", border: "#dde2df", accent: "#1d7a5c", accentSoft: "#e5f3ed" },
    dark: { canvas: "#0e1412", surface: "#151c19", elevated: "#1b2420", text: "#f2f6f4", muted: "#9aa7a1", border: "#2b3631", accent: "#69c9a4", accentSoft: "#183a2e" }
  },
  status: {
    healthy: { label: "Healthy", semantic: "positive" },
    warning: { label: "Attention", semantic: "caution" },
    offline: { label: "Offline", semantic: "neutral" },
    private: { label: "Private", semantic: "protected" },
    sealed: { label: "Sealed", semantic: "restricted" }
  }
} as const;

export const CERVEL_APPLICATION_SHELL = {
  regions: {
    sidebar: { id: "shell.sidebar", purpose: "identity-vault-navigation", collapsible: true },
    topbar: { id: "shell.topbar", purpose: "global-search-and-context", sticky: true },
    workspace: { id: "shell.workspace", purpose: "active-product-surface" },
    inspector: { id: "shell.inspector", purpose: "activity-properties", collapsible: true },
    statusbar: { id: "shell.statusbar", purpose: "node-vault-sync-privacy-status" }
  },
  globalSearch: { surface: "search" as CervelSurfaceId, placeholder: "Search your knowledge", shortcut: "mod+k" },
  inspectorTabs: ["activity", "properties"] as const,
  responsive: {
    wide: { sidebar: "expanded", inspector: "visible", navigation: "sidebar" },
    compact: { sidebar: "collapsed", inspector: "overlay", navigation: "sidebar" },
    mobile: { sidebar: "drawer", inspector: "sheet", navigation: "bottom-adaptive" }
  }
} as const;

export const CERVEL_EXPERIENCE_TOKENS = {
  layout: { sidebar: "experience.sidebar", workspace: "experience.workspace", inspector: "experience.inspector" },
  state: { healthy: "state.healthy", warning: "state.warning", private: "state.private", sealed: "state.sealed" },
  density: { compact: "density.compact", comfortable: "density.comfortable" }
} as const;

export function surfacesForClient(client: CervelClient): CervelExperienceSurface[] {
  return CERVEL_EXPERIENCE_SURFACES.filter((surface) => surface.clients.includes(client));
}

export function resolveTheme(theme: CervelTheme, prefersDark = false): "light" | "dark" {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

export function responsiveModeForWidth(width: number): CervelResponsiveMode {
  if (!Number.isFinite(width) || width < 0) throw new Error("Viewport width must be a non-negative finite number");
  if (width < 720) return "mobile";
  if (width < 1180) return "compact";
  return "wide";
}

export function assertSharedExperienceBoundary(): void {
  const required: CervelSurfaceId[] = ["vault-explorer", "corpus", "capture", "ask", "search", "trace", "graph"];
  for (const id of required) {
    const surface = CERVEL_EXPERIENCE_SURFACES.find((candidate) => candidate.id === id);
    if (!surface || surface.owner !== "cervel") throw new Error(`Shared CERVEL capability missing: ${id}`);
  }
}

export function assertApplicationShellBoundary(): void {
  if (CERVEL_BRAND.logo.policy !== "vendored-no-runtime-hotlink") throw new Error("CERVEL brand asset must be local at runtime");
  if (/^https?:\/\//i.test(CERVEL_BRAND.logo.asset)) throw new Error("CERVEL runtime brand asset must not be remote");
  if (CERVEL_APPLICATION_SHELL.globalSearch.surface !== "search") throw new Error("Global search must route through the shared retrieval surface");
  if (!CERVEL_APPLICATION_SHELL.inspectorTabs.includes("activity") || !CERVEL_APPLICATION_SHELL.inspectorTabs.includes("properties")) {
    throw new Error("Shared inspector must expose Activity and Properties");
  }
}
