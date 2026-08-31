# CERVEL Sync v2 / Device Enrollment

CERVEL Sync v2 binds synchronization to the same cryptographic device and embodiment identity used by Desktop, Browser Extension, and Mobile.

## Identity
Every enrolled embodiment has a stable `dev_…` device ID and `emb_…` embodiment ID, Ed25519 signing key, X25519 encryption key, key fingerprint, declared embodiment kind, capabilities, and vault-scoped permissions. Private keys remain local.

## Enrollment
A new device generates keys locally and submits only public identity plus requested permissions. The approving Local Node validates challenge expiry, Vault binding, capability/permission consistency, and exact requested permission semantics before registering the device with the authenticated zero-knowledge relay.

The Vault sync root is sealed specifically to the recipient using ephemeral X25519, HKDF-SHA256 and AES-256-GCM. The authenticated bundle binds `vault_id + device_id + embodiment_id + sync_epoch + approved-grant digest + expiry`; changing the grant, recipient, epoch or expiry invalidates decryption. The relay never receives the plaintext sync root.

## Synchronization
After acceptance, the recipient joins the existing encrypted Cloud Sync engine. Canonical records remain end-to-end encrypted before reaching the relay. Sync v2 creates no parallel knowledge store and the relay remains non-authoritative.

## Revocation and epochs
Revocation is enforced at two layers: the authoritative relay device registration is revoked so the device's signed requests are rejected, and the encrypted local device registry marks the identity revoked while advancing `sync_epoch`. Surviving local sessions are advanced to the new epoch.

Important security boundary: Sync v2 does **not yet rotate the Vault root encryption key on revocation**. A previously enrolled device necessarily possessed the old root key. Relay revocation prevents that identity from continuing to synchronize through the service, while the epoch provides the migration point for a future cryptographic root-key rotation/re-wrapping protocol. We do not claim post-revocation cryptographic erasure until that rotation protocol exists.

## Embodiments
- Desktop: full local Vault read/write/search, capture, Cortex/Trace, Sync and pairing.
- Browser Extension: capture + scoped Vault access + encrypted Sync.
- Mobile: note/voice/scan/file/image/memory capture + scoped Vault access + encrypted Sync.

## Compatibility
The existing `cervel-sync/v0.1` encrypted record/relay wire format remains supported during migration. Sync v2 adds identity, permission, enrollment and epoch semantics around that transport. A later wire migration can version record envelopes and introduce root-key rotation independently.
