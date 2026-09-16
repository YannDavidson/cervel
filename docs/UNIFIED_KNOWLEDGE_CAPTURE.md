# Unified Knowledge Capture

PR #79 makes **+ Add knowledge** the canonical capture entry point for CERVEL while preserving direct shortcuts.

The shared capture surface presents three first-party actions: **Add Note**, **Import File**, and **Add Source**. These are admission operations, not demo mutations and not reasoning actions. Ask CERVEL remains separate.

## Runtime path

Desktop capture crosses the Tauri command boundary and writes through the authenticated loopback Local Node API. Notes, files, and source references create canonical knowledge objects and original artifacts through `/v1/objects` and `/v1/objects/:id/artifacts`; the artifact route performs supported text ingestion and embedding. The renderer never receives the Local Node token and does not call Local Node HTTP endpoints directly.

**Add Note** reuses the existing note composer and `capture_note` command. **Import File** uses the browser's local file chooser, reads the selected bytes in the renderer, and passes them across Tauri IPC to `capture_file_bytes`; drag/drop and existing path-based capture remain available as direct shortcuts. **Add Source** records an explicit HTTP(S) source reference plus an optional user note through `capture_source`. Desktop does not fetch the remote URL, which avoids turning a convenience capture action into an SSRF/network trust boundary; connectors or browser capture remain responsible for acquiring remote content.

## Boundaries

File payloads remain capped at 24 MB in the native bridge. Browser-provided filenames are reduced to a basename before persistence. Source references accept only HTTP(S), reject control characters, and are capped in length. The Local Node remains responsible for principal authorization, object creation, artifact registration, ingestion, embeddings, provenance, and downstream corpus classification.

No synthetic demo principal, Vault, object, reducer, or fixture state is used by this flow. Capture creates persistent knowledge in the active real Vault.
