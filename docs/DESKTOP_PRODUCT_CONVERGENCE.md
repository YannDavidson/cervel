# Desktop Product Convergence

PR #84 makes the Tauri CERVEL Desktop the canonical local product experience launched by `npm run cervel:dev`.

## Canonical development path

`npm run cervel:dev` continues to own the supported developer lifecycle: doctor → encrypted Local Node bootstrap/reuse → readiness → Desktop. The final Desktop step now launches `desktop:canonical:dev`, which builds the TypeScript runtime and runs the Tauri shell in `apps/desktop-tauri/src-tauri`.

The prior Electron presentation remains temporarily available as `npm run desktop:legacy:dev` for compatibility and regression comparison, but it is explicitly deprecated and is not part of the canonical one-command path.

## Product convergence

The Tauri experience now includes real persistent surfaces for:

- Vault Explorer, Life/Enterprise semantic views, Search, Ask, Trace and Graph from earlier convergence work.
- Deliverables, read from canonical `deliverables`, `deliverable_blocks`, `deliverable_renders`, and dependency state in the active workspace.
- Connections, read from External Gateway client/grant/receipt state without exposing access tokens, token hashes, device codes or Local Node credentials.
- MCP visibility, including the stdio server command and supported gateway tools. MCP remains an external scoped client of CERVEL rather than a privileged renderer path.

## Trust boundaries

Renderer JavaScript only invokes Tauri commands. Tauri reads the active encrypted Vault runtime session and authenticates to the loopback Local Node with the local token and principal identity. The renderer never receives those credentials.

Deliverables are projections of canonical knowledge; they do not become a second knowledge store. Connections are projections of gateway registration and audit state; they do not expose secret material. MCP access continues through the existing External AI & Agent Gateway and its scope/disclosure/write-proposal controls.

## Deprecation boundary

This PR does not delete the legacy Electron implementation or its packaging pipeline. It removes it from the canonical developer launch path and gives it an explicit `legacy` command. Physical deletion can follow once the Tauri product path has passed sustained Alpha acceptance and packaging parity.
