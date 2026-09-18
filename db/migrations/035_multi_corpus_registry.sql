BEGIN;

CREATE TABLE corpus_membership_suppressions (
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  mega_tab text NOT NULL,
  tab text NOT NULL,
  subtab text NOT NULL DEFAULT '',
  enterprise_tenant_id uuid REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES principals(id),
  reason text NOT NULL DEFAULT 'user override',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (corpus_id, cko_id, mega_tab, tab, subtab, enterprise_tenant_id)
);

CREATE UNIQUE INDEX corpus_membership_suppressions_coordinate_idx
  ON corpus_membership_suppressions(corpus_id,cko_id,mega_tab,tab,subtab)
  WHERE enterprise_tenant_id IS NULL;

COMMENT ON TABLE corpus_membership_suppressions IS
  'Persisted user sovereignty overrides preventing removed automatic corpus memberships from reappearing during reclassification.';

COMMIT;
