# CERVEL Vault + Local Node v0.1

The Local Node runs the existing CERVEL knowledge engine on the owner's device. PostgreSQL 16 + pgvector remains the canonical graph/vector store; artifacts, device identity, API credentials, exports and backups live inside the Vault boundary.

## Security boundary

- Device identity, Vault content key and local API token are encrypted with AES-256-GCM. The wrapping key is derived with scrypt from the owner's passphrase.
- Artifact payloads are encrypted independently with authenticated encryption and written atomically.
- The API binds to `127.0.0.1` and all non-health routes require `X-CERVEL-LOCAL-TOKEN`.
- Database traffic is loopback-only. Local database pages rely on host full-disk encryption; portable backups are encrypted by CERVEL. This limitation is explicit rather than presenting PostgreSQL data-directory encryption as an application guarantee.
- No cloud service is required for ingestion, retrieval, CCP assembly, reasoning or Trace.

## Alpha commands

```bash
export CERVEL_VAULT_PASSPHRASE='use-a-long-passphrase'
npm run cervel -- init --vault /path/to/MyVault --name 'My Vault' --authority my-device
npm run cervel -- start --vault /path/to/MyVault
npm run cervel -- status --vault /path/to/MyVault
npm run cervel -- vault verify --vault /path/to/MyVault
npm run cervel -- backup --vault /path/to/MyVault
npm run cervel -- restore --vault /path/to/MyVault --from /path/to/backup.cvbackup
npm run cervel -- export --vault /path/to/MyVault --to /path/to/portable-export
npm run cervel -- lock --vault /path/to/MyVault
```

Docker is the only runtime prerequisite for the Alpha database. `start` launches a loopback-only pgvector container, applies upgrade-safe migrations, idempotently bootstraps the local node/workspace, and starts the API. The Vault never stores the passphrase.

## Portable format

`vault.json` is UTF-8 JSON and identifies `cervel-vault/v0.1`. Public device identity is PEM. Artifact metadata is JSON Lines. Encrypted payloads use the documented `CVLT01 | 12-byte nonce | 16-byte GCM tag | ciphertext` envelope. A `.cvbackup` contains an authenticated encrypted PostgreSQL custom dump and tar archive. These formats do not require a CERVEL cloud account.

`cervel export` deliberately produces an unencrypted, non-proprietary directory: a plain PostgreSQL SQL dump, decrypted artifact files, JSON Lines metadata and a JSON manifest. The CLI warns because the exported directory falls outside the Vault's encryption boundary.
