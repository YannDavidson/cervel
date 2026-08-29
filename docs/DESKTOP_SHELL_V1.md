# CERVEL Desktop Shell v1

CERVEL Desktop is the canonical local control plane for the CERVEL persistent semantic substrate. PR #58 introduces a Mac-first Tauri 2 shell while retaining the existing Electron desktop as a compatibility reference during migration.

## Responsibilities

- Own the Local Node lifecycle and expose health in the workstation and system tray.
- Anchor the local Vault and future unlock/selection flow.
- Present Vault, Corpus Explorer, Search, Graph, Capture, Cortex, Trace, Models and Connections as one semantic workstation.
- Become the long-term owner of browser native-messaging registration and embodiment pairing.
- Keep model providers behind the Intelligence Gateway boundary: **Knowledge stays here. Reasoning may happen there.**

## Architecture

```text
CERVEL Desktop (Tauri / WebView)
        |
        +-- Rust native control plane
        |      +-- Local Node lifecycle
        |      +-- Vault location
        |      +-- system tray
        |      +-- browser bridge registration
        |
        +-- Semantic workstation UI
               +-- Vault / Corpora / Search / Graph / Capture
               +-- Cortex / Trace
               +-- Models / Connections
        |
        v
CERVEL Local Node -> Vault -> Semantic layer -> Cortex / Trace / Gateway
```

## Mac-first

The initial bundle targets `.app` and `.dmg` on macOS 13+. The architecture intentionally keeps Rust native responsibilities small: process lifecycle, native shell integration, filesystem/security boundaries and system tray. Product orchestration remains in the shared CERVEL application layer.

## Migration boundary

The existing Electron implementation remains in `apps/desktop` during PR #58. It is not deleted until the Tauri shell reaches parity for Vault lifecycle and packaged Local Node startup. This avoids destabilizing the existing cross-platform desktop CI while the Mac-first embodiment becomes canonical.

## PR #58 success path

1. Launch CERVEL Desktop.
2. See Vault and Local Node status.
3. Start the Local Node from Desktop or the system tray.
4. Explore the semantic workstation surfaces.
5. Register/pair the Browser Alpha bridge.
6. Browser captures flow toward the Desktop-managed Local Node and persistent Vault.

PR #59 will deepen the Vault workspace with direct note/file capture, drag-and-drop, universal capture and live knowledge browsing rather than overloading the shell foundation.
