BEGIN;

ALTER TABLE knowledge_events DROP CONSTRAINT IF EXISTS knowledge_events_event_type_check;
ALTER TABLE knowledge_events ADD CONSTRAINT knowledge_events_event_type_check CHECK (event_type IN (
  'OBJECT_CREATED','OBJECT_UPDATED','OBJECT_DELETED','ARTIFACT_VERSIONED',
  'CLAIM_INTRODUCED','CLAIM_CONFIRMED','CLAIM_ASSERTED','CLAIM_MODIFIED','CLAIM_CONTRADICTED','CLAIM_CHALLENGED','CLAIM_SUPERSEDED','CLAIM_WITHDRAWN','CLAIM_RETRACTED',
  'CONTRADICTION_DETECTED','CONTRADICTION_RESOLVED','RELATIONSHIP_CREATED','RELATIONSHIP_REMOVED',
  'DECISION_CREATED','DECISION_CHANGED','DEADLINE_CHANGED','ENTITY_ADDED',
  'SOURCE_CONNECTED','SOURCE_CHANGED','SOURCE_DELETED','SOURCE_STALE','SOURCE_RECOVERED',
  'KNOWLEDGE_BECAME_STALE','KNOWLEDGE_HEALTH_DEGRADED','KNOWLEDGE_HEALTH_RECOVERED','RISK_DETECTED'
));

CREATE TABLE ckep_reactive_dispatches (
  journal_event_id uuid PRIMARY KEY REFERENCES ckep_event_journal(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  knowledge_event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','succeeded','failed')),
  impact_run_id uuid REFERENCES impact_propagation_runs(id) ON DELETE SET NULL,
  impact_count integer NOT NULL DEFAULT 0,
  watch_match_count integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(node_id,workspace_id,knowledge_event_id)
);
CREATE INDEX ckep_reactive_dispatches_scope_idx ON ckep_reactive_dispatches(node_id,workspace_id,status,started_at DESC);

COMMIT;
