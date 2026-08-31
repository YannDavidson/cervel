# CERVEL Sync v2 / Device Enrollment

CERVEL Sync v2 binds synchronization to the same cryptographic device and embodiment identity used by Desktop, Browser Extension, and Mobile.

## Identity

Every enrolled embodiment has a stable `dev_…` device ID and `emb_…` embodiment ID, Ed25519 signing key, X25519 encryption key, key fingerprint, declared embodiment kind, capabilities, and vault-scoped permissions. Desktop, Browser Extension, and Mobile use shared enrollment profiles while remaining independently revocable identities.

## Enrollment

A new device generates its keys locally. Only public keys and requested permissions leave the device in the enrollment challenge. An already-authorized device approves the request. The Vault sync root is then sealed specifically to the recipient's X25519 public key using an ephemeral X25519 key, HKDF-SHA256, and AES-256-GCM. The relay never receives the plaintext sync root.

The encrypted enrollment bundle is bound to `vault_id + device_id + embodiment_id + sync_epoch + expiry`; it cannot be opened by another device identity.

## Synchronization

After acceptance, the recipient joins the existing zero-knowledge Cloud Sync engine. Canonical records remain end-to-end encrypted before reaching the relay. Sync v2 does not create a second knowledge store and does not make the relay authoritative.

## Revocation and epochs

Device revocation advances the Vault `sync_epoch`. A revoked device is rejected and surviving devices must converge on the new epoch. This provides the control point for future root-key rotation/re-wrapping without changing CERVEL's canonical knowledge model.

## Embodiments

- Desktop: full local Vault read/write/search, capture, Cortex/Trace, Sync and pairing.
- Browser Extension: capture + scoped Vault access + encrypted Sync.
- Mobile: note/voice/scan/file/image/memory capture + scoped Vault access + encrypted Sync.

## Compatibility

The existing `cervel-sync/v0.1` encrypted record/relay wire format remains supported during migration. Sync v2 adds identity, permission, enrollment, and epoch semantics around that proven encrypted transport. A later wire migration can version record envelopes independently without breaking enrolled devices.
