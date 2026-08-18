BEGIN;

CREATE TABLE agent_identities (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  kind text NOT NULL CHECK (kind IN ('internal','external')),
  provider text,
  external_key text,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  capabilities text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id,principal_id),
  UNIQUE(id,node_id)
);
CREATE INDEX agent_identities_scope_idx ON agent_identities(node_id,enabled,principal_id);

CREATE TABLE agent_workspace_grants (
  agent_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES principals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(agent_id,workspace_id),
  FOREIGN KEY(agent_id,node_id) REFERENCES agent_identities(id,node_id) ON DELETE CASCADE,
  CHECK (permissions <@ ARRAY['memory:read','memory:write','claim:write','context:read','events:read','watch:read']::text[])
);
CREATE INDEX agent_workspace_grants_scope_idx ON agent_workspace_grants(node_id,workspace_id,agent_id);

CREATE TABLE agent_observations (
  id uuid PRIMARY KEY,
  agent_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('cko','claim','entity')),
  subject_id uuid NOT NULL,
  observation text NOT NULL CHECK (length(btrim(observation)) > 0),
  confidence real NOT NULL DEFAULT 0.7 CHECK (confidence BETWEEN 0 AND 1),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(agent_id,node_id) REFERENCES agent_identities(id,node_id) ON DELETE CASCADE
);
CREATE INDEX agent_observations_scope_idx ON agent_observations(node_id,workspace_id,agent_id,created_at DESC);

CREATE TABLE agent_subscriptions (
  id uuid PRIMARY KEY,
  agent_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  watch_id uuid REFERENCES knowledge_watches(id) ON DELETE CASCADE,
  event_types text[] NOT NULL DEFAULT '{}',
  impact_kinds text[] NOT NULL DEFAULT '{}',
  min_confidence real NOT NULL DEFAULT 0.55 CHECK (min_confidence BETWEEN 0 AND 1),
  enabled boolean NOT NULL DEFAULT true,
  cursor_at timestamptz NOT NULL DEFAULT 'epoch',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(agent_id,node_id) REFERENCES agent_identities(id,node_id) ON DELETE CASCADE,
  UNIQUE(agent_id,workspace_id,watch_id)
);
CREATE INDEX agent_subscriptions_scope_idx ON agent_subscriptions(agent_id,node_id,workspace_id,enabled);

CREATE TABLE agent_delivery_receipts (
  id uuid PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES agent_subscriptions(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_identities(id) ON DELETE CASCADE,
  event_id uuid REFERENCES knowledge_events(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES watch_alerts(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  CHECK (event_id IS NOT NULL OR alert_id IS NOT NULL)
);
CREATE UNIQUE INDEX agent_delivery_event_uidx ON agent_delivery_receipts(subscription_id,event_id) WHERE event_id IS NOT NULL AND alert_id IS NULL;
CREATE UNIQUE INDEX agent_delivery_alert_uidx ON agent_delivery_receipts(subscription_id,alert_id) WHERE alert_id IS NOT NULL;

COMMIT;
