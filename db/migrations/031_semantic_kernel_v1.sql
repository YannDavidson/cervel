BEGIN;

CREATE TABLE semantic_kernel_contracts (
  version text PRIMARY KEY,
  schema_uri text NOT NULL UNIQUE,
  schema_sha256 char(64) NOT NULL CHECK(schema_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK(status IN ('draft','active','deprecated')),
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO semantic_kernel_contracts(version,schema_uri,schema_sha256,status,activated_at)
VALUES('1.0','https://schemas.cervel.ai/semantic-kernel/1.0/schema.json','34f268726ed4e7bd9350133ee18db1e8d893df212089a46ceed2e890120a9d57','active',now());

CREATE TABLE semantic_kernel_records (
  id uuid PRIMARY KEY,
  kernel_version text NOT NULL DEFAULT '1.0' REFERENCES semantic_kernel_contracts(version),
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('cko','entity','claim','relationship','event','state','memory','provenance','authority','permission')),
  canonical_uri text NOT NULL,
  lifecycle text NOT NULL DEFAULT 'active' CHECK(lifecycle IN ('active','archived','superseded','tombstoned')),
  sensitivity text NOT NULL DEFAULT 'internal' CHECK(sensitivity IN ('public','internal','confidential','restricted','sealed')),
  authority_status text NOT NULL DEFAULT 'reported' CHECK(authority_status IN ('observed','reported','inferred','verified','approved','official','disputed','superseded','hypothetical')),
  confidence real CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK(payload_sha256 ~ '^[0-9a-f]{64}$'),
  observed_at timestamptz NOT NULL,
  effective_from timestamptz,
  effective_until timestamptz,
  supersedes_id uuid REFERENCES semantic_kernel_records(id),
  policy_id uuid REFERENCES policies(id),
  provenance_event_id uuid REFERENCES provenance_events(id),
  created_by uuid REFERENCES principals(id),
  record_version integer NOT NULL DEFAULT 1 CHECK(record_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id,canonical_uri),
  CHECK(effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from),
  CHECK(supersedes_id IS NULL OR supersedes_id <> id)
);

CREATE TABLE semantic_kernel_bindings (
  record_id uuid NOT NULL REFERENCES semantic_kernel_records(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK(resource_type IN ('cko','entity','claim','relationship','knowledge_event','provenance_event','policy','context_package','answer','compilation')),
  resource_id uuid NOT NULL,
  binding_role text NOT NULL DEFAULT 'canonical' CHECK(binding_role IN ('canonical','source','derived','projection')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(record_id,resource_type,resource_id),
  UNIQUE(resource_type,resource_id,binding_role)
);

CREATE TABLE semantic_kernel_versions (
  id uuid PRIMARY KEY,
  record_id uuid NOT NULL REFERENCES semantic_kernel_records(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK(version > 0),
  snapshot jsonb NOT NULL,
  snapshot_sha256 char(64) NOT NULL CHECK(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  changed_by uuid REFERENCES principals(id),
  change_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(record_id,version)
);

CREATE INDEX semantic_kernel_scope_kind_idx ON semantic_kernel_records(node_id,workspace_id,kind,lifecycle);
CREATE INDEX semantic_kernel_current_state_idx ON semantic_kernel_records(node_id,workspace_id,kind,effective_from DESC) WHERE lifecycle='active';
CREATE INDEX semantic_kernel_temporal_idx ON semantic_kernel_records(node_id,workspace_id,effective_from,effective_until);
CREATE INDEX semantic_kernel_supersedes_idx ON semantic_kernel_records(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX semantic_kernel_payload_gin_idx ON semantic_kernel_records USING gin(payload jsonb_path_ops);
CREATE INDEX semantic_kernel_bindings_lookup_idx ON semantic_kernel_bindings(resource_type,resource_id);

ALTER TABLE semantic_kernel_records ENABLE ROW LEVEL SECURITY;

COMMIT;
