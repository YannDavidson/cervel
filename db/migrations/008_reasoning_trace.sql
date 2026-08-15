BEGIN;

ALTER TABLE claims ADD COLUMN IF NOT EXISTS fingerprint char(64);
CREATE UNIQUE INDEX IF NOT EXISTS claims_node_fingerprint_uidx
  ON claims(node_id, fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS claim_conflicts (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  claim_a_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  claim_b_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  conflict_type text NOT NULL CHECK (conflict_type IN ('polarity','value','temporal','scope')),
  confidence real NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (claim_a_id <> claim_b_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS claim_conflicts_pair_uidx
  ON claim_conflicts(node_id, LEAST(claim_a_id, claim_b_id), GREATEST(claim_a_id, claim_b_id), conflict_type);

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid REFERENCES workspaces(id),
  principal_id uuid NOT NULL REFERENCES principals(id),
  context_package_id uuid NOT NULL REFERENCES context_packages(id) ON DELETE RESTRICT,
  model_run_id uuid REFERENCES model_runs(id),
  answer_text text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertainty jsonb NOT NULL DEFAULT '{}'::jsonb,
  trace_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answer_claims (
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('supporting','conflicting','mentioned')),
  ordinal integer NOT NULL DEFAULT 0,
  PRIMARY KEY(answer_id, claim_id, role)
);

CREATE INDEX IF NOT EXISTS answers_context_idx ON answers(context_package_id, created_at DESC);
CREATE INDEX IF NOT EXISTS answer_claims_answer_idx ON answer_claims(answer_id, role, ordinal);

COMMIT;