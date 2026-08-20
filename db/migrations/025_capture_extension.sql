BEGIN;

ALTER TABLE capture_jobs DROP CONSTRAINT capture_jobs_source_type_check;
ALTER TABLE capture_jobs ADD CONSTRAINT capture_jobs_source_type_check
  CHECK (source_type IN ('upload','clip','note','page','selection','image','link','pdf'));

CREATE TABLE browser_captures (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  capture_job_id uuid NOT NULL REFERENCES capture_jobs(id) ON DELETE CASCADE,
  capture_type text NOT NULL CHECK (capture_type IN ('page','selection','image','link','pdf')),
  canonical_url text NOT NULL,
  source_url text NOT NULL,
  source_origin text NOT NULL,
  author text,
  published_at timestamptz,
  captured_at timestamptz NOT NULL,
  fingerprint char(64) NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  tags text[] NOT NULL DEFAULT '{}',
  capture_intent text,
  project_ref text,
  provenance jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id,workspace_id,fingerprint)
);

CREATE INDEX browser_captures_recent_idx ON browser_captures(workspace_id,created_at DESC);
CREATE INDEX browser_captures_url_idx ON browser_captures(node_id,workspace_id,canonical_url);

COMMENT ON TABLE browser_captures IS 'Validated browser evidence manifests. Web content is always untrusted data and never an instruction source.';

COMMIT;
