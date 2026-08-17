BEGIN;

CREATE TABLE knowledge_diffs (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id),
  previous_artifact_id uuid REFERENCES artifacts(id),
  current_artifact_id uuid NOT NULL REFERENCES artifacts(id),
  previous_version integer,
  current_version integer NOT NULL,
  diff_kind text NOT NULL DEFAULT 'semantic' CHECK (diff_kind IN ('semantic','text','metadata')),
  summary text,
  added jsonb NOT NULL DEFAULT '[]'::jsonb,
  removed jsonb NOT NULL DEFAULT '[]'::jsonb,
  modified jsonb NOT NULL DEFAULT '[]'::jsonb,
  unchanged_count integer NOT NULL DEFAULT 0,
  confidence real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cko_id,current_artifact_id)
);

CREATE TABLE claim_evolutions (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id),
  previous_claim_id uuid REFERENCES claims(id),
  current_claim_id uuid REFERENCES claims(id),
  evolution_type text NOT NULL CHECK (evolution_type IN ('introduced','confirmed','modified','contradicted','superseded','withdrawn')),
  knowledge_diff_id uuid REFERENCES knowledge_diffs(id) ON DELETE SET NULL,
  confidence real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (previous_claim_id IS NOT NULL OR current_claim_id IS NOT NULL)
);

ALTER TABLE claims ADD COLUMN IF NOT EXISTS temporal_status text NOT NULL DEFAULT 'current'
  CHECK (temporal_status IN ('current','superseded','withdrawn','contradicted'));
ALTER TABLE claims ADD COLUMN IF NOT EXISTS observed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE claims ADD COLUMN IF NOT EXISTS effective_at timestamptz;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS superseded_by_claim_id uuid REFERENCES claims(id);

CREATE TABLE knowledge_events (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  event_type text NOT NULL CHECK (event_type IN ('CLAIM_INTRODUCED','CLAIM_CONFIRMED','CLAIM_MODIFIED','CLAIM_CONTRADICTED','CLAIM_SUPERSEDED','CLAIM_WITHDRAWN','SOURCE_CHANGED','SOURCE_DELETED','DECISION_CHANGED','DEADLINE_CHANGED','ENTITY_ADDED','RISK_DETECTED')),
  subject_type text NOT NULL CHECK (subject_type IN ('cko','claim','entity','source','decision','project')),
  subject_id uuid NOT NULL,
  cko_id uuid REFERENCES knowledge_objects(id),
  knowledge_diff_id uuid REFERENCES knowledge_diffs(id) ON DELETE SET NULL,
  previous_claim_id uuid REFERENCES claims(id),
  current_claim_id uuid REFERENCES claims(id),
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  observed_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_event_impacts (
  event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  impacted_type text NOT NULL CHECK (impacted_type IN ('cko','claim','entity','relationship','context_package','answer','library','project','decision')),
  impacted_id uuid NOT NULL,
  impact_kind text NOT NULL DEFAULT 'affected' CHECK (impact_kind IN ('affected','stale','invalidated','requires_review')),
  confidence real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(event_id,impacted_type,impacted_id,impact_kind)
);

CREATE INDEX knowledge_diffs_workspace_time_idx ON knowledge_diffs(workspace_id,created_at DESC);
CREATE INDEX claim_evolutions_cko_time_idx ON claim_evolutions(cko_id,observed_at DESC);
CREATE INDEX knowledge_events_workspace_time_idx ON knowledge_events(workspace_id,observed_at DESC);
CREATE INDEX knowledge_events_cko_time_idx ON knowledge_events(cko_id,observed_at DESC) WHERE cko_id IS NOT NULL;
CREATE INDEX claims_temporal_current_idx ON claims(node_id,temporal_status,semantic_subject_entity_id,semantic_predicate);

COMMIT;
