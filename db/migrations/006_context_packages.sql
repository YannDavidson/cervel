BEGIN;

CREATE TABLE context_packages (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid REFERENCES workspaces(id),
  principal_id uuid NOT NULL REFERENCES principals(id),
  acting_for uuid REFERENCES principals(id),
  profile text NOT NULL,
  query text NOT NULL,
  task_type text NOT NULL,
  request_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  authorization_scope jsonb NOT NULL,
  policy_snapshot_hash char(64) NOT NULL,
  uncertainty jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE context_evidence (
  context_package_id uuid NOT NULL REFERENCES context_packages(id) ON DELETE CASCADE,
  fragment_id uuid NOT NULL REFERENCES fragments(id),
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id),
  evidence_role text NOT NULL CHECK (evidence_role IN ('primary','supporting','conflicting')),
  scores jsonb NOT NULL,
  citation jsonb NOT NULL,
  ordinal integer NOT NULL,
  PRIMARY KEY(context_package_id, evidence_role, ordinal)
);

CREATE TABLE context_claims (
  context_package_id uuid NOT NULL REFERENCES context_packages(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id),
  PRIMARY KEY(context_package_id, claim_id)
);

ALTER TABLE context_packages ENABLE ROW LEVEL SECURITY;

COMMIT;
