BEGIN;

CREATE TABLE ckep_event_journal (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_uri text NOT NULL,
  event_type text NOT NULL,
  subject_uri text NOT NULL,
  subject_type text NOT NULL,
  observed_at timestamptz NOT NULL,
  effective_at timestamptz,
  sequence bigint NOT NULL CHECK (sequence > 0),
  previous_event_uri text,
  idempotency_key text NOT NULL,
  envelope_hash text NOT NULL,
  envelope jsonb NOT NULL,
  published_by uuid REFERENCES principals(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,event_uri),
  UNIQUE(workspace_id,idempotency_key),
  UNIQUE(workspace_id,sequence)
);
CREATE INDEX ckep_event_journal_scope_time_idx ON ckep_event_journal(node_id,workspace_id,observed_at DESC,sequence DESC);
CREATE INDEX ckep_event_journal_type_idx ON ckep_event_journal(node_id,workspace_id,event_type,sequence DESC);
CREATE INDEX ckep_event_journal_subject_idx ON ckep_event_journal(node_id,workspace_id,subject_uri,sequence DESC);

CREATE OR REPLACE FUNCTION reject_ckep_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CKEP_EVENT_JOURNAL_IMMUTABLE' USING ERRCODE='55000';
END;
$$;
CREATE TRIGGER ckep_event_journal_no_update BEFORE UPDATE ON ckep_event_journal FOR EACH ROW EXECUTE FUNCTION reject_ckep_journal_mutation();
CREATE TRIGGER ckep_event_journal_no_delete BEFORE DELETE ON ckep_event_journal FOR EACH ROW EXECUTE FUNCTION reject_ckep_journal_mutation();

CREATE TABLE ckep_subscriptions (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  event_types text[] NOT NULL DEFAULT '{}',
  subject_types text[] NOT NULL DEFAULT '{}',
  subject_uris text[] NOT NULL DEFAULT '{}',
  min_confidence real NOT NULL DEFAULT 0 CHECK (min_confidence BETWEEN 0 AND 1),
  enabled boolean NOT NULL DEFAULT true,
  cursor_sequence bigint NOT NULL DEFAULT 0 CHECK (cursor_sequence >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ckep_subscriptions_scope_idx ON ckep_subscriptions(node_id,workspace_id,principal_id,enabled);

CREATE TABLE ckep_delivery_receipts (
  id uuid PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES ckep_subscriptions(id) ON DELETE CASCADE,
  journal_event_id uuid NOT NULL REFERENCES ckep_event_journal(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  UNIQUE(subscription_id,journal_event_id)
);

COMMIT;
