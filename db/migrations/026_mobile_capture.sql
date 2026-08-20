BEGIN;
CREATE TABLE mobile_devices (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  label text NOT NULL,
  platform text NOT NULL CHECK(platform IN ('ios','android')),
  capability_hash char(64) NOT NULL UNIQUE CHECK(capability_hash ~ '^[0-9a-f]{64}$'),
  permissions text[] NOT NULL DEFAULT ARRAY['capture','retrieve'],
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
CREATE TABLE mobile_captures (
  id uuid PRIMARY KEY,
  mobile_device_id uuid NOT NULL REFERENCES mobile_devices(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  capture_id text NOT NULL,
  capture_type text NOT NULL CHECK(capture_type IN ('text','photo','document_scan','voice_note','link','share_sheet')),
  fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  receipt_status text NOT NULL CHECK(receipt_status IN ('received','ingesting','ready','failed')),
  consent jsonb NOT NULL,
  provenance jsonb NOT NULL,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(mobile_device_id,capture_id),
  UNIQUE(node_id,workspace_id,fingerprint)
);
CREATE INDEX mobile_devices_scope_idx ON mobile_devices(node_id,workspace_id) WHERE revoked_at IS NULL;
CREATE INDEX mobile_captures_receipts_idx ON mobile_captures(mobile_device_id,received_at DESC);
COMMENT ON TABLE mobile_captures IS 'Mobile evidence receipts. Location and timestamps exist only when explicit capture consent is recorded.';
COMMIT;
