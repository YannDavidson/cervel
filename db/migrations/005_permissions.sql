BEGIN;

CREATE TABLE policies (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  name text NOT NULL,
  effect_default text NOT NULL DEFAULT 'deny' CHECK (effect_default IN ('allow','deny')),
  document jsonb NOT NULL,
  policy_hash char(64) NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_objects
  ADD CONSTRAINT knowledge_objects_policy_fk
  FOREIGN KEY (policy_id) REFERENCES policies(id);

CREATE TABLE policy_bindings (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  policy_id uuid NOT NULL REFERENCES policies(id),
  principal_id uuid REFERENCES principals(id),
  resource_type text NOT NULL CHECK (resource_type IN ('node','workspace','library','cko','artifact','fragment','claim')),
  resource_id uuid NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX policy_bindings_lookup_idx
  ON policy_bindings(node_id, principal_id, resource_type, resource_id, priority DESC);

ALTER TABLE knowledge_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

COMMIT;
