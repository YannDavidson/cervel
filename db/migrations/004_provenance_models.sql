BEGIN;

CREATE TABLE models (
  id uuid PRIMARY KEY,
  node_id uuid REFERENCES nodes(id),
  provider text NOT NULL,
  model_name text NOT NULL,
  model_version text,
  purpose text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE embeddings
  ADD CONSTRAINT embeddings_model_fk
  FOREIGN KEY (model_id) REFERENCES models(id);

CREATE TABLE model_runs (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  model_id uuid NOT NULL REFERENCES models(id),
  principal_id uuid REFERENCES principals(id),
  operation text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_hash char(64),
  output_hash char(64),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','succeeded','failed','cancelled'))
);

CREATE TABLE provenance_events (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_principal_id uuid REFERENCES principals(id),
  model_run_id uuid REFERENCES model_runs(id),
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provenance_io (
  provenance_event_id uuid NOT NULL REFERENCES provenance_events(id) ON DELETE CASCADE,
  io_role text NOT NULL CHECK (io_role IN ('input','output')),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  sha256 char(64),
  ordinal integer NOT NULL DEFAULT 0,
  PRIMARY KEY(provenance_event_id, io_role, resource_type, resource_id)
);

CREATE INDEX provenance_io_resource_idx ON provenance_io(resource_type, resource_id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  principal_id uuid REFERENCES principals(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text,
  ip_hash text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_node_time_idx ON audit_events(node_id, occurred_at DESC);

COMMIT;
