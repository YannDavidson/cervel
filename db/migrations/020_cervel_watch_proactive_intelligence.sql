BEGIN;

CREATE TABLE knowledge_watches (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  name text NOT NULL,
  intent text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  event_types text[] NOT NULL DEFAULT '{}',
  subject_types text[] NOT NULL DEFAULT '{}',
  impact_kinds text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  focus jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_event_confidence real NOT NULL DEFAULT 0.55 CHECK (min_event_confidence BETWEEN 0 AND 1),
  min_impact_confidence real NOT NULL DEFAULT 0.35 CHECK (min_impact_confidence BETWEEN 0 AND 1),
  min_score real NOT NULL DEFAULT 0.55 CHECK (min_score BETWEEN 0 AND 1),
  cooldown_seconds integer NOT NULL DEFAULT 3600 CHECK (cooldown_seconds BETWEEN 0 AND 2592000),
  channels text[] NOT NULL DEFAULT ARRAY['inbox']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_watches_scope_idx ON knowledge_watches(node_id,workspace_id,principal_id,enabled);

CREATE TABLE watch_matches (
  id uuid PRIMARY KEY,
  watch_id uuid NOT NULL REFERENCES knowledge_watches(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  score real NOT NULL CHECK (score BETWEEN 0 AND 1),
  event_score real NOT NULL CHECK (event_score BETWEEN 0 AND 1),
  impact_score real NOT NULL CHECK (impact_score BETWEEN 0 AND 1),
  keyword_score real NOT NULL CHECK (keyword_score BETWEEN 0 AND 1),
  focus_score real NOT NULL CHECK (focus_score BETWEEN 0 AND 1),
  matched_impact_ids uuid[] NOT NULL DEFAULT '{}',
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  suppressed boolean NOT NULL DEFAULT false,
  suppression_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(watch_id,event_id)
);
CREATE INDEX watch_matches_event_idx ON watch_matches(node_id,workspace_id,event_id,score DESC);

CREATE TABLE watch_alerts (
  id uuid PRIMARY KEY,
  watch_id uuid NOT NULL REFERENCES knowledge_watches(id) ON DELETE CASCADE,
  match_id uuid NOT NULL UNIQUE REFERENCES watch_matches(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES knowledge_events(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('info','important','critical')),
  title text NOT NULL,
  body text NOT NULL,
  why_now jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','dismissed')),
  surfaced_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz
);
CREATE INDEX watch_alerts_inbox_idx ON watch_alerts(principal_id,node_id,workspace_id,status,surfaced_at DESC);

COMMIT;
