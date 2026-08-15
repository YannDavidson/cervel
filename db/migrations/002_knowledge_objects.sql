BEGIN;

CREATE TABLE knowledge_objects (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  type text NOT NULL,
  title text NOT NULL,
  alternate_titles text[] NOT NULL DEFAULT '{}',
  summary text,
  primary_artifact_id uuid,
  languages text[] NOT NULL DEFAULT '{}',
  jurisdictions text[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  observed_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  epistemic_status cervel_epistemic_status NOT NULL DEFAULT 'raw',
  confidence real CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  policy_id uuid,
  lifecycle_status cervel_lifecycle_status NOT NULL DEFAULT 'active',
  object_version integer NOT NULL DEFAULT 1 CHECK (object_version >= 1),
  extensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX knowledge_objects_node_workspace_idx ON knowledge_objects(node_id, workspace_id);
CREATE INDEX knowledge_objects_type_idx ON knowledge_objects(node_id, type);
CREATE INDEX knowledge_objects_validity_idx ON knowledge_objects(node_id, valid_from, valid_until);
CREATE INDEX knowledge_objects_title_fts_idx
  ON knowledge_objects USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')));

CREATE TABLE object_aliases (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  alias_path text NOT NULL,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, alias_path)
);

CREATE TABLE library_memberships (
  library_id uuid NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  added_by uuid REFERENCES principals(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(library_id, cko_id)
);

CREATE TABLE storage_locations (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  provider_type text NOT NULL,
  config_ref text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE artifacts (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  role cervel_artifact_role NOT NULL,
  mime_type text NOT NULL,
  storage_location_id uuid NOT NULL REFERENCES storage_locations(id),
  object_key text NOT NULL,
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(storage_location_id, object_key)
);

ALTER TABLE knowledge_objects
  ADD CONSTRAINT knowledge_objects_primary_artifact_fk
  FOREIGN KEY (primary_artifact_id) REFERENCES artifacts(id);

CREATE TABLE fragments (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES artifacts(id) ON DELETE CASCADE,
  type text NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  text_content text,
  char_start integer,
  char_end integer,
  content_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artifact_id, ordinal),
  CHECK (char_end IS NULL OR char_start IS NULL OR char_end >= char_start)
);

CREATE INDEX fragments_cko_idx ON fragments(cko_id, ordinal);
CREATE INDEX fragments_fts_idx ON fragments USING gin (to_tsvector('simple', coalesce(text_content,'')));

CREATE TABLE embeddings (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  fragment_id uuid NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
  model_id uuid NOT NULL,
  dimensions integer NOT NULL CHECK (dimensions > 0),
  embedding vector,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fragment_id, model_id)
);

CREATE TABLE cko_versions (
  id uuid PRIMARY KEY,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES principals(id),
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cko_id, version)
);

COMMIT;
