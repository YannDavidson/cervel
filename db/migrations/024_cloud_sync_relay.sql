BEGIN;

CREATE TABLE sync_vaults (
  vault_id text PRIMARY KEY,
  next_sequence bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sync_devices (
  vault_id text NOT NULL REFERENCES sync_vaults(vault_id) ON DELETE CASCADE,
  device_id text NOT NULL,
  signing_public_key text NOT NULL,
  encryption_public_key text NOT NULL,
  enrolled_at timestamptz NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY(vault_id,device_id)
);

CREATE TABLE sync_request_nonces (
  vault_id text NOT NULL,
  device_id text NOT NULL,
  nonce_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(vault_id,device_id,nonce_hash),
  FOREIGN KEY(vault_id,device_id) REFERENCES sync_devices(vault_id,device_id) ON DELETE CASCADE
);

CREATE TABLE sync_records (
  vault_id text NOT NULL REFERENCES sync_vaults(vault_id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  record_id text NOT NULL,
  device_id text NOT NULL,
  entity_id text NOT NULL,
  envelope jsonb NOT NULL,
  ciphertext_bytes bigint NOT NULL CHECK(ciphertext_bytes>=0),
  stored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(vault_id,sequence),
  UNIQUE(vault_id,record_id),
  FOREIGN KEY(vault_id,device_id) REFERENCES sync_devices(vault_id,device_id)
);

CREATE TABLE sync_chunks (
  vault_id text NOT NULL REFERENCES sync_vaults(vault_id) ON DELETE CASCADE,
  chunk_id text NOT NULL,
  nonce text NOT NULL,
  auth_tag text NOT NULL,
  plaintext_size bigint NOT NULL CHECK(plaintext_size>=0),
  ciphertext bytea NOT NULL DEFAULT ''::bytea,
  complete boolean NOT NULL DEFAULT false,
  stored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(vault_id,chunk_id)
);

CREATE INDEX sync_records_incremental_idx ON sync_records(vault_id,sequence);
CREATE INDEX sync_nonce_expiry_idx ON sync_request_nonces(expires_at);

COMMENT ON TABLE sync_records IS 'Opaque E2EE envelopes only. Never store CKO type, title, path, source, plaintext hash, or key material.';
COMMENT ON TABLE sync_chunks IS 'Vault-keyed chunk identifiers and ciphertext only; deduplication is scoped to one Vault.';

COMMIT;
