# CERVEL Browser Extension Alpha

CERVEL Capture is the browser embodiment of CERVEL Persistent Knowledge Infrastructure. The Chrome/Edge alpha captures web context into the user-owned Vault, preserves provenance, automatically classifies the resulting CKO into CERVEL Corpora, and returns related Vault knowledge without turning the browser extension itself into a knowledge runtime.

## Alpha scope

Chrome and Microsoft Edge are the first-class Manifest V3 targets. The alpha supports page capture, selected-text capture, link capture, PDF metadata capture, and user notes. Captures can be created while the CERVEL Node is unavailable; a bounded browser-local queue retries them after pairing or reconnection.

Every browser installation receives a persistent `embodiment_id` and `device_id`. Pairing happens through the `ai.cervel.capture` native-messaging bridge. The bridge validates the browser embodiment identity, verifies the loopback CERVEL Node is ready, and returns the active Vault/node/workspace context. The Local Node credential never enters browser JavaScript.

## Capture lifecycle

1. The extension extracts page metadata, readable page text, selected text with surrounding context, a link, or PDF source metadata.
2. The user can attach a note, tags, capture intent, and project reference.
3. The capture is stored in the browser offline queue first.
4. When paired, the native host forwards the evidence to `/v1/local/captures` over loopback.
5. The Local Node validates and canonicalizes the evidence, detects duplicates, creates the `web_evidence` CKO, stores the source artifact, ingests/embeds text, and emits provenance.
6. The Corpus Engine runs `capture.ingested` automatic classification when Corpora are registered.
7. The response includes the classification receipt plus up to five related Vault objects sharing the same semantic corpus branch.
8. The popup surfaces where CERVEL filed the capture and the related knowledge already present in the Vault.

## Evidence and safety boundary

Browser evidence continues to use `cervel-capture/v0.1` for compatibility with the existing Local Node ingestion route while the shared Embodiment Foundation owns browser identity, device identity, capabilities, pairing semantics, and future IPC evolution. DOM-derived content is always tagged `untrusted_web_content` with `instruction_policy: never_execute`.

Page content cannot choose node, workspace, principal, storage location, permissions, or Local Node credentials. The native host supplies those from the owner-only Desktop configuration. Suspicious page instructions can be preserved as evidence but are never treated as CERVEL instructions.

## Permissions and privacy

- `activeTab` and `scripting` support explicit capture of the active page.
- `contextMenus` exposes Add page, Add selection, and Add link actions.
- `storage` holds preferences, embodiment/device identifiers, pairing metadata, and the bounded offline queue.
- `alarms` retries queued captures using bounded exponential backoff.
- `nativeMessaging` reaches the CERVEL Node through the local bridge.
- No persistent website `host_permissions` or cloud endpoint is requested.

## Packaging

Run `npm run build:capture-extension` to emit:

- `dist/extensions/chromium` — Chrome/Chromium MV3 alpha.
- `dist/extensions/edge` — Microsoft Edge MV3 alpha.
- `dist/extensions/firefox` — compatibility artifact retained for later rollout.

Chrome and Edge share the same security and capture contracts. Store signing and native-host installer registration remain distribution operations outside the extension runtime.
