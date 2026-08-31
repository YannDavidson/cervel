# CERVEL Mobile Capture Alpha

CERVEL Mobile is the Life Capture embodiment of the persistent Vault. The alpha targets iOS and Android through the existing Expo/React Native shell and keeps capture offline-first.

## Capture surfaces

- Notes: user-authored text captured directly into the encrypted outbox.
- Voice: local recording with optional transcript derivative; original audio remains the primary artifact.
- Photo: camera capture with optional OCR derivative.
- Scan: camera or imported PDF/image treated as document evidence with optional OCR.
- Links: validated HTTP(S) URLs captured as external evidence.
- Files: PDF and image import for mobile evidence capture.

Location and capture timestamps are consent-controlled metadata and are not attached unless the user enables them.

## Device identity

The Mobile shell accepts a CERVEL enrollment package. Sync v2 packages bind the phone to a `dev_…` device identity, `emb_…` embodiment identity and sync epoch. Pairing state and the local outbox encryption key are stored with platform secure storage and are unavailable before device unlock.

## Offline-first outbox

Every capture is validated and encrypted before it enters SQLite. The queue stores ciphertext, nonce and authentication tag rather than plaintext capture content. Delivery attempts use exponential backoff; failed network delivery leaves the encrypted record on-device for retry. The UI exposes queue/retry/failed counts without decrypting records.

Background delivery is opportunistic. Manual retry is always available.

## Trust and provenance

Captured external content is marked `untrusted_captured_content` with `instruction_policy: never_execute`. OCR and transcription are derivative evidence with their own provenance rather than replacements for the source artifact.

## Alpha boundary

This PR establishes the iOS/Android capture shell and encrypted local delivery queue. App Store / Play Store signing, production push transport, share extensions, camera-native document edge detection and full post-revocation root-key rotation are separate rollout milestones.
