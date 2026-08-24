BEGIN;

ALTER TABLE corpus_memberships
  ADD COLUMN branch_sensitivity text NOT NULL DEFAULT 'internal' CHECK(branch_sensitivity IN ('public','internal','confidential','restricted','sealed')),
  ADD COLUMN branch_visibility text NOT NULL DEFAULT 'node' CHECK(branch_visibility IN ('node','private','sealed'));

CREATE TABLE life_corpus_branch_policies(
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  mega_tab text NOT NULL,
  tab text NOT NULL DEFAULT 'overview',
  subtab text NOT NULL DEFAULT '',
  sensitivity text NOT NULL CHECK(sensitivity IN ('internal','confidential','restricted','sealed')),
  visibility text NOT NULL CHECK(visibility IN ('private','sealed')),
  policy_version text NOT NULL DEFAULT '1.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(corpus_id,mega_tab,tab,subtab)
);

CREATE TABLE life_sealed_access_sessions(
  id uuid PRIMARY KEY,
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  mega_tab text NOT NULL,
  subtab text NOT NULL DEFAULT '',
  proof_type text NOT NULL CHECK(proof_type IN ('local_vault_unlock','biometric','device_reauth','recovery_key')),
  proof_reference_hash char(64) NOT NULL CHECK(proof_reference_hash ~ '^[0-9a-f]{64}$'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK(expires_at>granted_at)
);

CREATE TABLE life_corpus_receipts(
  id uuid PRIMARY KEY,
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  action text NOT NULL CHECK(action IN ('classified','sealed_access_granted','sealed_access_revoked')),
  details jsonb NOT NULL,
  actor_principal_id uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX life_branch_policy_lookup_idx ON life_corpus_branch_policies(corpus_id,mega_tab,tab,subtab);
CREATE INDEX life_sealed_session_active_idx ON life_sealed_access_sessions(corpus_id,principal_id,mega_tab,subtab,expires_at) WHERE revoked_at IS NULL;
CREATE INDEX corpus_memberships_sensitivity_idx ON corpus_memberships(corpus_id,branch_sensitivity,branch_visibility);
ALTER TABLE life_sealed_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_corpus_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW corpus_cko_semantic_view AS
SELECT cd.node_id, cd.workspace_id, cd.id corpus_id, cd.corpus_key, cd.title corpus_title, cd.visibility,
       cm.mega_tab, cm.tab, cm.subtab, cm.membership_source, cm.confidence, cm.reasons,
       cm.branch_sensitivity, cm.branch_visibility,
       ko.id cko_id, ko.type cko_type, ko.title cko_title, ko.summary cko_summary,
       ko.lifecycle_status, ko.object_version, ko.updated_at cko_updated_at
FROM corpus_memberships cm
JOIN corpus_definitions cd ON cd.id=cm.corpus_id AND cd.enabled=true
JOIN knowledge_objects ko ON ko.id=cm.cko_id AND ko.node_id=cd.node_id
WHERE ko.lifecycle_status<>'deleted';

COMMENT ON TABLE life_corpus_branch_policies IS 'Sensitivity and sealed-access defaults for semantic Life Corpus branches; canonical knowledge remains in CKOs.';
COMMIT;
