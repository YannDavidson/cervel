# PR #64 — Universal Share to CERVEL

## Goal
Make CERVEL a native destination from iOS Share, Android Sharesheet, and Safari without creating a second knowledge store.

## Canonical flow
`Source app → OS share boundary → native handoff → CERVEL share inbox → Mobile Capture → encrypted outbox → Local Node → canonical CKO/artifact/provenance → Life Corpus classification`

Shared content is evidence, never instructions. Every payload is normalized as `untrusted_captured_content` with `never_execute` before entering Mobile Capture.

## iOS boundary
The Share Extension accepts HTTP(S) URLs, plain text and file-backed attachments. Files are copied into the private App Group `group.ai.cervel.capture/share-staging` with an 18 MiB ceiling. The extension stores only a pending envelope in App Group defaults and opens the fixed wake-up route `cervel://share/import`. No shared content is placed in the deep-link URL.

`CervelShareInbox` consumes the App Group envelope exactly once, reads an approved staged basename only, converts the staged attachment for the existing Mobile Capture contract, removes the staged file and deletes the pending envelope.

## Android boundary
`ShareReceiverActivity` accepts `ACTION_SEND`. Text/HTTP(S) input is bounded. `content://` streams are copied into app-private `filesDir/share-staging` with the same 18 MiB ceiling. The receiver stores a pending envelope in private preferences and launches an explicit-package `cervel://share/import` wake-up route with no attacker-controlled query data. `CervelShareInbox` consumes and deletes that envelope and staged file.

## Safari handoff
Safari normally enters through the iOS Share Extension. Explicit Open-in-CERVEL flows use the same fixed wake-up route; shared URLs are read from the native inbox, not URL parameters. Only HTTP(S) URLs survive normalization, embedded URL credentials are rejected, and shared content never becomes executable instructions.

## Encrypted outbox transition
`/share/import` consumes the native inbox, calls `enqueueUniversalShare`, creates a normal `share_sheet` Mobile Capture under the enrolled device identity, and writes it through the existing AES-GCM encrypted SQLite outbox before any delivery attempt. A Local Node outage therefore leaves the share encrypted on-device for retry.

## Privacy and security boundaries
- OS share components never upload directly.
- Delivery remains governed by the enrolled mobile device capability.
- Shared content is untrusted evidence with `never_execute`.
- 18 MiB raw attachment ceiling is enforced at native staging and again by Mobile Capture normalization.
- Deep links are wake-up signals only; payloads are never accepted from deep-link query parameters.
- Staged file names are generated locally and basename/path traversal is rejected by the consumer.
- The share inbox is transient transport state, not a memory or knowledge store.
- Canonical Life classification happens only after Local Node CKO/artifact/provenance creation.
- Sealed Life content is not exposed by sharing.

## Expo/native integration
`withCervelUniversalShare` applies the iOS App Group entitlement, adds the Android exported share receiver/intent filters, and copies native bridge/share sources into generated projects during prebuild. CI performs Expo config validation and clean iOS/Android prebuilds. Production Apple extension target signing/provisioning and store-distribution credentials remain release engineering work.
