BEGIN;

ALTER TABLE source_connections
  ADD COLUMN IF NOT EXISTS delta_cursor text,
  ADD COLUMN IF NOT EXISTS delta_cursor_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_status text NOT NULL DEFAULT 'disabled'
    CHECK (webhook_status IN ('disabled','pending','active','error')),
  ADD COLUMN IF NOT EXISTS webhook_expires_at timestamptz;

ALTER TABLE watched_sources
  ADD COLUMN IF NOT EXISTS recursive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_remote_id text,
  ADD COLUMN IF NOT EXISTS delta_mode text NOT NULL DEFAULT 'poll'
    CHECK (delta_mode IN ('poll','delta','webhook')),
  ADD COLUMN IF NOT EXISTS freshness_score real NOT NULL DEFAULT 1.0
    CHECK (freshness_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS freshness_reason text;

ALTER TABLE source_documents
  ADD COLUMN IF NOT EXISTS remote_path text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS source_delta_events (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
  watched_source_id uuid REFERENCES watched_sources(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_drive','dropbox','onedrive')),
  remote_id text,
  event_type text NOT NULL CHECK (event_type IN ('created','updated','deleted','moved','cursor','webhook')),
  provider_cursor text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS source_delta_events_pending_idx
  ON source_delta_events(connection_id,created_at) WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS source_webhook_subscriptions (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
  watched_source_id uuid REFERENCES watched_sources(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_drive','dropbox','onedrive')),
  provider_subscription_id text,
  channel_token_hash text,
  resource_id text,
  callback_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','revoked','error')),
  expires_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id,provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS source_webhook_active_idx
  ON source_webhook_subscriptions(connection_id,status,expires_at);

CREATE TABLE IF NOT EXISTS source_picker_cache (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
  remote_id text NOT NULL,
  parent_remote_id text,
  remote_kind text NOT NULL CHECK (remote_kind IN ('file','folder','drive')),
  name text NOT NULL,
  mime_type text,
  remote_path text,
  modified_at timestamptz,
  version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id,remote_id)
);
CREATE INDEX IF NOT EXISTS source_picker_cache_parent_idx
  ON source_picker_cache(connection_id,parent_remote_id,name);

CREATE OR REPLACE FUNCTION cervel_source_freshness(last_success timestamptz, interval_minutes integer, source_status text)
RETURNS real LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN source_status IN ('error','stale') THEN 0.35::real
    WHEN source_status = 'paused' THEN 0.65::real
    WHEN last_success IS NULL THEN 0.50::real
    WHEN extract(epoch FROM (now() - last_success)) / 60.0 <= interval_minutes THEN 1.00::real
    WHEN extract(epoch FROM (now() - last_success)) / 60.0 <= interval_minutes * 2 THEN 0.85::real
    WHEN extract(epoch FROM (now() - last_success)) / 60.0 <= interval_minutes * 3 THEN 0.65::real
    ELSE 0.35::real
  END;
$$;

COMMIT;
