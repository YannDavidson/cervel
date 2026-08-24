BEGIN;
CREATE TABLE enterprise_tenants(
 id uuid PRIMARY KEY,corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
 tenant_key text NOT NULL CHECK(tenant_key ~ '^[a-z][a-z0-9-]{1,63}$'),name text NOT NULL,
 legal_name text,domain text,jurisdiction text,authority_metadata jsonb NOT NULL DEFAULT '{}',
 is_default boolean NOT NULL DEFAULT false,status text NOT NULL DEFAULT 'active' CHECK(status IN('active','suspended','archived')),
 created_by uuid REFERENCES principals(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(corpus_id,tenant_key)
);
CREATE UNIQUE INDEX enterprise_tenant_one_default_idx ON enterprise_tenants(corpus_id) WHERE is_default=true AND status='active';
CREATE TABLE enterprise_tenant_members(
 tenant_id uuid NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN('viewer','contributor','manager','authority')),granted_by uuid REFERENCES principals(id),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,principal_id)
);
CREATE TABLE enterprise_scopes(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,parent_scope_id uuid REFERENCES enterprise_scopes(id),
 scope_key text NOT NULL CHECK(scope_key ~ '^[a-z][a-z0-9-]{1,63}$'),name text NOT NULL,
 scope_type text NOT NULL CHECK(scope_type IN('organization','business_unit','team','project','product','customer','data_domain','external')),
 authority_status text NOT NULL DEFAULT 'approved' CHECK(authority_status IN('reported','inferred','verified','approved','official','disputed','superseded')),
 authority_metadata jsonb NOT NULL DEFAULT '{}',created_by uuid REFERENCES principals(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,scope_key),CHECK(parent_scope_id IS NULL OR parent_scope_id<>id)
);
CREATE TABLE enterprise_branch_policies(
 corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,mega_tab text NOT NULL,tab text NOT NULL DEFAULT 'overview',
 sensitivity text NOT NULL CHECK(sensitivity IN('internal','confidential','restricted')),
 authority_default text NOT NULL CHECK(authority_default IN('reported','inferred','verified','approved','official')),
 policy_version text NOT NULL DEFAULT '1.0',created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(corpus_id,mega_tab,tab)
);
ALTER TABLE corpus_memberships
 ADD COLUMN enterprise_tenant_id uuid REFERENCES enterprise_tenants(id) ON DELETE CASCADE,
 ADD COLUMN enterprise_scope_id uuid REFERENCES enterprise_scopes(id) ON DELETE SET NULL,
 ADD COLUMN authority_status text NOT NULL DEFAULT 'reported' CHECK(authority_status IN('observed','reported','inferred','verified','approved','official','disputed','superseded','hypothetical')),
 ADD COLUMN authority_metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE corpus_memberships DROP CONSTRAINT corpus_memberships_corpus_id_cko_id_mega_tab_tab_subtab_key;
ALTER TABLE corpus_memberships ADD CONSTRAINT corpus_memberships_tenant_coordinate_key UNIQUE NULLS NOT DISTINCT(corpus_id,cko_id,mega_tab,tab,subtab,enterprise_tenant_id);
ALTER TABLE enterprise_scopes ADD CONSTRAINT enterprise_scopes_id_tenant_unique UNIQUE(id,tenant_id);
ALTER TABLE corpus_memberships ADD CONSTRAINT corpus_memberships_scope_tenant_fk FOREIGN KEY(enterprise_scope_id,enterprise_tenant_id) REFERENCES enterprise_scopes(id,tenant_id);
ALTER TABLE corpus_memberships ADD CONSTRAINT corpus_memberships_scope_requires_tenant CHECK(enterprise_scope_id IS NULL OR enterprise_tenant_id IS NOT NULL);
CREATE TABLE enterprise_corpus_receipts(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES enterprise_tenants(id) ON DELETE CASCADE,cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
 action text NOT NULL CHECK(action IN('classified','filed','authority_asserted','scope_created')),details jsonb NOT NULL,actor_principal_id uuid REFERENCES principals(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enterprise_membership_tenant_scope_idx ON corpus_memberships(enterprise_tenant_id,enterprise_scope_id,mega_tab,authority_status);
CREATE INDEX enterprise_scopes_tree_idx ON enterprise_scopes(tenant_id,parent_scope_id,scope_type);
CREATE INDEX enterprise_receipts_cko_time_idx ON enterprise_corpus_receipts(cko_id,created_at DESC);
ALTER TABLE enterprise_tenants ENABLE ROW LEVEL SECURITY;ALTER TABLE enterprise_scopes ENABLE ROW LEVEL SECURITY;ALTER TABLE enterprise_corpus_receipts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE VIEW corpus_cko_semantic_view AS
SELECT cd.node_id,cd.workspace_id,cd.id corpus_id,cd.corpus_key,cd.title corpus_title,cd.visibility,
 cm.mega_tab,cm.tab,cm.subtab,cm.membership_source,cm.confidence,cm.reasons,
 ko.id cko_id,ko.type cko_type,ko.title cko_title,ko.summary cko_summary,ko.lifecycle_status,ko.object_version,ko.updated_at cko_updated_at,
 cm.branch_sensitivity,cm.branch_visibility,
 cm.enterprise_tenant_id,cm.enterprise_scope_id,cm.authority_status,cm.authority_metadata
FROM corpus_memberships cm JOIN corpus_definitions cd ON cd.id=cm.corpus_id AND cd.enabled=true
JOIN knowledge_objects ko ON ko.id=cm.cko_id AND ko.node_id=cd.node_id WHERE ko.lifecycle_status<>'deleted';
COMMENT ON TABLE enterprise_tenants IS 'Tenant boundary for Enterprise Corpus semantic memberships; canonical CKO content remains in knowledge_objects.';
COMMIT;
