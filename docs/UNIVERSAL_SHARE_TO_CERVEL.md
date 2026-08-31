# PR #64 — Universal Share to CERVEL

## Goal
Make CERVEL a native destination from iOS Share, Android Sharesheet, and Safari without creating a second knowledge store.

## Canonical flow
`Source app → OS share boundary → native handoff → CERVEL secure share inbox → Mobile Capture → encrypted outbox → Local Node → canonical CKO/artifact/provenance → Life Corpus classification`

Shared content is evidence, never instructions. The shared payload is normalized as `untrusted_captured_content` with `never_execute` before it can enter the capture pipeline.

## iOS
`ShareViewController.swift` is the native Share Extension boundary. It accepts URL/plain-text providers, stages only a handoff payload in the CERVEL App Group, opens `cervel://share/import`, and completes the extension request. Binary attachments require the later native App Group file-container adapter; they must not be copied into plaintext JS storage.

## Android
`ShareReceiverActivity` handles `ACTION_SEND`, stages the handoff in app-private preferences, and deep-links to `cervel://share/import`. Binary `content://` streams require the later native bridge to copy into encrypted CERVEL staging before JS access.

## Safari
Safari URLs use the same share-extension path. A `cervel://share/import` handoff is also reserved for explicit Safari/Open-in-CERVEL flows. Only HTTP(S) URLs are accepted by the shared normalization contract.

## Privacy boundaries
- No shared payload is uploaded directly by an OS extension/receiver.
- Delivery remains governed by the enrolled mobile device capability and existing encrypted outbox.
- Shared web/text content remains untrusted and `never_execute`.
- 18 MiB raw payload ceiling remains aligned with Mobile Capture.
- The share inbox is transport state, not a memory or knowledge store.
- Canonical classification happens only after Local Node CKO/artifact/provenance creation.
- Sealed Life content is not exposed by sharing.

## Native integration note
Expo prebuild must wire the iOS extension target/App Group entitlement and Android intent filters/receiver. The native source in this PR defines those trust boundaries; production signing and entitlement provisioning remain distribution work, not semantic architecture.
