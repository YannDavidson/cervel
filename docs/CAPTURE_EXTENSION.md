# CERVEL Capture Extension

CERVEL Capture is a high-frequency acquisition client for the Local Node. It captures evidence plus provenance; it does not flatten a webpage into an ordinary note and it is never a knowledge runtime.

## Evidence contract

Every capture records the capture type, canonical and observed URL, origin, title, author, published time when available, capture time, browser acquisition context, user note, tags, capture intent, project reference, content hash, and a stable duplicate fingerprint. Page, selection, visible image, link, and PDF-source captures share `cervel-capture/v0.1`. The portable artifact uses `cervel-browser-evidence/v0.1` JSON, with binary screenshots stored as a separate original artifact.

The Local Node canonicalizes URLs, removes common tracking parameters, verifies that a page cannot nominate a canonical URL on another origin, caps input sizes, normalizes control characters, checks node/workspace scope, detects duplicates, creates a `web_evidence` CKO, stores artifacts, and emits a `browser_evidence_captured` provenance event.

## Prompt-injection boundary

All DOM-derived fields are labeled `untrusted_web_content` with `instruction_policy: never_execute`. Suspicious instructions are preserved because they may themselves be evidence, but they are never used as routing, permissions, tool, Vault, project, or model instructions. The native host adds node, workspace, principal, and storage scope from its owner-only Desktop configuration; page content cannot supply those fields.

## Permissions and privacy

- `activeTab` and `scripting` allow an explicit capture of the current page.
- `contextMenus` provides page, selection, image, and link acquisition.
- `storage` holds user preferences and a bounded offline retry queue.
- `alarms` retries queued captures with bounded exponential backoff.
- `nativeMessaging` reaches the Local Node through `ai.cervel.capture`.
- No persistent website host permission or cloud endpoint is requested.

The Desktop writes an owner-only, short-lived native-host configuration when a Vault opens and removes it when the Vault locks. The extension never receives the Local Node token. If the Node or host is unavailable, captures remain in browser-local storage with status and manual retry controls.

## Browser rollout

Run `npm run build:capture-extension` to generate Chromium and Firefox packages from the same source. Chromium is the primary Manifest V3 target. Firefox adds the stable extension ID `capture@cervel.ai`. On macOS, use the emitted `xcrun safari-web-extension-converter` command to create the signed Safari Web Extension Xcode project. Browser-specific native-host manifests live in `apps/capture-native-host/manifests`; production installers replace the explicit host path and extension ID placeholders during signed packaging.

Chrome/Chromium loads `dist/extensions/chromium` as an unpacked extension for development. Firefox loads `dist/extensions/firefox/manifest.json` temporarily. Safari signing and store distribution remain platform signing operations; the capture protocol and security boundary are identical.
