# CERVEL Cloud Sync

CERVEL Cloud Sync is an optional, end-to-end encrypted replication layer for a Vault that already works without a network. The Local Node remains the knowledge runtime and the user's Vault remains authoritative. The relay stores opaque encrypted state; it cannot answer questions, inspect CKO content, or reconstruct the Vault.

## Security boundary

- A 256-bit Vault sync root key is created and retained by clients. It is never uploaded to the relay.
- Records use AES-256-GCM with protocol and causal metadata bound as authenticated data.
- Logical entity IDs and chunk IDs are transformed with Vault-keyed HMACs before upload.
- Artifact chunks use independently derived keys. Deduplication is confined to one Vault and does not reveal cross-user equality.
- Devices authenticate every request with an Ed25519 signature, a five-minute timestamp window, and a single-use nonce.
- Enrollment transfers the root key in a short-lived bundle sealed to the new device's X25519 public key. Revocation immediately rejects future requests from that device.
- The transport requires HTTPS except for loopback development addresses.

The relay intentionally retains only the minimum operational metadata:

| Stored | Never stored in plaintext |
| --- | --- |
| Random Vault and device handles | Vault name or owner identity |
| Device public keys and revocation time | Private keys or Vault root key |
| Per-Vault sequence, version vector, opaque entity handle | CKO type, title, body, CKURI, claims, provenance, CCP, or Trace |
| Ciphertext length and upload completion | Source path, plaintext hash, MIME type, or filename |

Traffic timing and ciphertext sizes remain observable to the relay. Padding and anonymity are outside this protocol version; clients should not treat the relay as an anonymity service.

## Replication model

Local mutations enter an encrypted, durable offline journal. Synchronization uploads missing Vault-scoped chunks, pushes unsent envelopes, then pulls records after the last durable cursor. Version vectors distinguish causal updates from concurrent edits. Concurrent edits use a stable record-ID ordering on every device, and the losing encrypted revision is preserved as conflict history rather than discarded.

Artifacts are split into fixed-size chunks, encrypted client-side, uploaded in 512 KiB resumable parts, and verified against the client-side content hash after restore. Remote backup manifests are encrypted records. Reset discards only the local sync cursor/materialization and rebuilds from the relay; complete deletion removes the Vault, devices, nonces, records, and chunks through database cascades.

## Local Node commands

After opening a Vault, configure the optional relay with `cervel sync enable --relay https://sync.example`. The sync command family provides `status`, `run`, `pause`, `resume`, `reset`, `backup`, `journal`, `enrollment-request`, `enroll`, `accept`, `revoke`, and `delete`. Configuration, client keys, the root key, journal, cursors, and cached encrypted chunks are stored in the Vault's encrypted private state.

`sync delete` is intentionally destructive for the remote replica only. The local Vault remains intact and usable offline. A user can enable a new remote replica later.

## Deployment and verification

Run migration `024_cloud_sync_relay.sql`, then start the relay from the standard image with `node dist/apps/sync-relay/src/server.js`. It exposes `/live` and database-backed `/ready`. The `cloud-sync-integration` workflow runs migrations against PostgreSQL/pgvector, starts the real HTTP relay, enrolls two devices, creates concurrent offline mutations, uploads and restores a multi-part artifact, proves deterministic convergence and restart persistence, revokes a device, and deletes all remote state.
