BEGIN;

CREATE TABLE knowledge_dependencies (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('cko','claim','entity','relationship','context_package','answer','library','project','decision','source')),
  source_id uuid NOT NULL,
  relation text NOT NULL CHECK (relation IN ('depends_on','derived_from','supports','contradicts','supersedes','affected_by')),
  target_type text NOT NULL CHECK (target_type IN ('cko','claim','entity','relationship','context_package','answer','library','project','decision','source')),
  target_id uuid NOT NULL,
  confidence real NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  strength real NOT NULL DEFAULT 1 CHECK (strength BETWEEN 0 AND 1),
  propagation_enabled boolean NOT NULL DEFAULT true,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES principals(id) ON DELETE SET NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_type <> target_type OR source_id <> target_id),
  CHECK (valid_until IS NULL OR valid_until >= valid_from),
  UNIQUE(node_id,workspace_id,source_type,source_id,relation,target_type,target_id)
);

CREATE INDEX knowledge_dependencies_source_idx ON knowledge_dependencies(node_id,workspace_id,source_type,source_id,relation) WHERE valid_until IS NULL;
CREATE INDEX knowledge_dependencies_target_idx ON knowledge_dependencies(node_id,workspace_id,target_type,target_id,relation) WHERE valid_until IS NULL;

CREATE TABLE impact_propagation_runs (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  root_type text NOT NULL,
  root_id uuid NOT NULL,
  max_depth integer NOT NULL DEFAULT 4 CHECK (max_depth BETWEEN 1 AND 12),
  confidence_floor real NOT NULL DEFAULT 0.2 CHECK (confidence_floor BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  impacted_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

CREATE TABLE impact_paths (
  propagation_run_id uuid NOT NULL REFERENCES impact_propagation_runs(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  impacted_type text NOT NULL,
  impacted_id uuid NOT NULL,
  depth integer NOT NULL CHECK (depth >= 1),
  path jsonb NOT NULL,
  confidence real NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  impact_kind text NOT NULL CHECK (impact_kind IN ('affected','stale','invalidated','requires_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(propagation_run_id,impacted_type,impacted_id,impact_kind)
);

CREATE INDEX impact_paths_event_idx ON impact_paths(event_id,depth,confidence DESC);

ALTER TABLE knowledge_event_impacts ADD COLUMN IF NOT EXISTS propagation_run_id uuid REFERENCES impact_propagation_runs(id) ON DELETE SET NULL;
ALTER TABLE knowledge_event_impacts ADD COLUMN IF NOT EXISTS depth integer;
ALTER TABLE knowledge_event_impacts ADD COLUMN IF NOT EXISTS path jsonb;

COMMIT;
