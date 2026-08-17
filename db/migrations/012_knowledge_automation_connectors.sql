BEGIN;

CREATE TABLE source_connections (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_drive','dropbox','onedrive')),
  account_subject text,
  account_email text,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  provider_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','reauth_required','disconnected','error')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, workspace_id, provider, account_subject)
);
CREATE INDEX source_connections_scope_idx ON source_connections(node_id,workspace_id,provider,status);

CREATE TABLE watched_sources (
  id uuid PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  library_id uuid REFERENCES libraries(id) ON DELETE SET NULL,
  remote_id text NOT NULL,
  remote_kind text NOT NULL DEFAULT 'file' CHECK (remote_kind IN ('file','folder','drive')),
  name text NOT NULL,
  mime_type text,
  sync_enabled boolean NOT NULL DEFAULT true,
  sync_interval_minutes integer NOT NULL DEFAULT 60 CHECK (sync_interval_minutes BETWEEN 5 AND 10080),
  next_sync_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_success_at timestamptz,
  last_remote_modified_at timestamptz,
  last_remote_version text,
  last_content_sha256 text,
  cursor text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','syncing','fresh','stale','error','paused')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, remote_id)
);
CREATE INDEX watched_sources_due_idx ON watched_sources(sync_enabled,next_sync_at) WHERE sync_enabled=true;
CREATE INDEX watched_sources_scope_idx ON watched_sources(node_id,workspace_id,status);

CREATE TABLE source_documents (
  id uuid PRIMARY KEY,
  watched_source_id uuid NOT NULL REFERENCES watched_sources(id) ON DELETE CASCADE,
  remote_id text NOT NULL,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  remote_version text,
  content_sha256 text NOT NULL,
  remote_modified_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(watched_source_id,remote_id)
);

CREATE TABLE source_sync_runs (
  id uuid PRIMARY KEY,
  watched_source_id uuid NOT NULL REFERENCES watched_sources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('running','unchanged','changed','failed')),
  remote_version text,
  previous_sha256 text,
  content_sha256 text,
  cko_id uuid REFERENCES knowledge_objects(id) ON DELETE SET NULL,
  artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX source_sync_runs_source_idx ON source_sync_runs(watched_source_id,started_at DESC);

CREATE TABLE knowledge_health_notifications (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  watched_source_id uuid REFERENCES watched_sources(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('source_stale','sync_failed','reauth_required','source_recovered')),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  message text NOT NULL,
  dedupe_key text NOT NULL,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,dedupe_key)
);
CREATE INDEX knowledge_health_open_idx ON knowledge_health_notifications(workspace_id,created_at DESC) WHERE resolved_at IS NULL;

COMMIT;
