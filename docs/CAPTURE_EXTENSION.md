# CERVEL Browser Extension Alpha

CERVEL Capture is the browser embodiment of CERVEL Persistent Knowledge Infrastructure. The Chrome/Edge alpha captures web context into the user-owned Vault, preserves provenance, automatically classifies the resulting CKO into CERVEL Corpora, and returns related Vault knowledge without turning the browser extension itself into a knowledge runtime.

## Alpha scope

Chrome and Microsoft Edge are the first-class Manifest V3 targets. The alpha supports page capture, selected-text capture, link capture, PDF metadata capture, and user notes. Captures can be created while the CERVEL Node is unavailable; a bounded browser-local queue retries them after pairing or reconnection.

Every browser installation receives a persistent `embodiment_id` and `device_id`. Pairing happens through the `ai.cervel.capture` native-messaging bridge. The bridge validates the browser embodiment identity, verifies the loopback CERVEL Node is ready, and returns the active Vault/node/workspace context. The Local Node credential never enters browser JavaScript.

## Developer installation

The one-command native-host developer installer currently supports macOS and Linux. Windows support is intentionally deferred until the Desktop packaging path provides a real executable native host wrapper.

Prerequisites: Node.js 22+, Docker, Chrome 121+ or Edge 121+, and `CERVEL_VAULT_PASSPHRASE` set to a 12+ character local development passphrase.

```bash
export CERVEL_VAULT_PASSPHRASE='your-local-development-passphrase'
npm install
npm run cervel:extension:dev -- --browser chrome
```

Use `--browser edge` for Edge or `--browser both` to register the native host for both browsers. `--vault /absolute/path` selects a non-default Vault. The command builds CERVEL and the extension, initializes the default Vault when needed, starts the Local Node, provisions the owner-only native-host config, installs/registers `ai.cervel.capture`, and prints the unpacked extension directory.

Then open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the printed extension directory. The Chromium/Edge developer build receives a fixed public key at build time, giving it the stable development extension ID `ljaccdmbcojoogpmgkmglchlnhogiomf`; the source manifest remains identity-neutral, and the native host is restricted to that development origin.

The installer writes native-host registration only into the current user's profile. On macOS/Linux it creates an owner-only launcher and browser `NativeMessagingHosts` manifest. It does not request administrator privileges, publish the extension, or expose the Local Node token to browser JavaScript.

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

Page content cannot choose node, workspace, principal, storage location, permissions, or Local Node credentials. The native host supplies those from owner-only local configuration. Suspicious page instructions can be preserved as evidence but are never treated as CERVEL instructions.

## Permissions and privacy

- `activeTab` and `scripting` support explicit capture of the active page.
- `contextMenus` exposes Add page, Add selection, and Add link actions.
- `storage` holds preferences, embodiment/device identifiers, pairing metadata, and the bounded offline queue.
- `alarms` retries queued captures using bounded exponential backoff.
- `nativeMessaging` reaches the CERVEL Node through the local bridge.
- No persistent website `host_permissions` or cloud endpoint is requested.

## Packaging

Run `npm run build:capture-extension` to emit `dist/extensions/chromium`, `dist/extensions/edge`, and the retained Firefox compatibility artifact. The stable developer key is injected only into the Chromium/Edge build artifacts. Store signing and production identity remain later distribution operations.
