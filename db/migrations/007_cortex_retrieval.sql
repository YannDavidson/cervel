BEGIN;

ALTER TABLE embeddings
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS model_name text NOT NULL DEFAULT 'deterministic-v0.1',
  ADD COLUMN IF NOT EXISTS normalized boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS embeddings_fragment_idx
  ON embeddings(node_id, fragment_id);

CREATE INDEX IF NOT EXISTS context_packages_principal_time_idx
  ON context_packages(node_id, principal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS context_evidence_fragment_idx
  ON context_evidence(fragment_id);

COMMIT;
