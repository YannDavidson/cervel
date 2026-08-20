# CERVEL Mobile Capture Alpha

CERVEL Mobile is a focused iOS and Android capture/retrieval companion. It is not a portable Desktop clone and never becomes the knowledge runtime. Originals, OCR/transcript derivatives, receipts, retrieval, provenance, deduplication, and permissions remain governed by the Local Node and optional Cloud Sync protocol.

## Security and consent

The app requires the device biometric or platform passcode before opening. Its queue key and pairing capability live in SecureStore with device-only, authentication-required access. Capture envelopes are encrypted before entering the SQLite outbox. Background delivery and manual retry decrypt one record in memory at a time.

Location and capture timestamp are independent, off-by-default choices. Queue time is operational state required to manage the local outbox; it is not inserted into capture provenance. A location is rejected unless location consent is recorded, and a capture timestamp is rejected unless timestamp consent is recorded. Revocation hashes and disables the mobile capability at the Local Node immediately.

All captured and derived content is `untrusted_captured_content` with `instruction_policy: never_execute`. OCR and transcription may preserve malicious-looking source text because it can be evidence; that text cannot select a Vault, project, permission, tool, delivery target, or model instruction.

## Capture and retrieval

Alpha supports text, camera photo, document scan, file/PDF, voice note, link, and Android share-target capture. iOS uses the `cervel://` capture route as the handoff contract for its signed Share Extension target. On-device OCR and transcription are accessed through `CervelMobileIntelligence`; the original media is always retained and every derivative records its engine and hash. If native intelligence is unavailable, the original is queued without fabricating a derivative.

Each capture selects a paired Vault and optional project, then records tags, intent, consent and provenance. Successful Local Node ingestion returns a durable receipt with CKO and ingestion status. Retrieval is a narrow, workspace-scoped hybrid search and does not expose Desktop administration.

## Delivery

`LocalNodeMobileDelivery` accepts only HTTPS except for simulator loopback and uses a revocable capture/retrieve capability rather than the general Local Node token. `CloudSyncMobileDelivery` submits a client-built end-to-end encrypted Cloud Sync envelope through the existing signed device record channel. Therefore the relay sees ciphertext and causal metadata, not mobile evidence.

Desktop creates pairing packages through the local-only mobile-device API and can revoke them remotely. Mobile secrets never enter the renderer or Cloud Sync relay. Offline records remain encrypted until either delivery succeeds or the user deletes them.

## Native builds

The app is an Expo/React Native project in `apps/mobile`, targeting iOS and Android from one capture protocol. Run `npm install`, `npm run typecheck`, and `npm run prebuild` in that directory. Store signing, Apple Share Extension signing, Android App Links, and production OCR/transcription native-module packaging are release operations and do not alter the Local Node boundary.
