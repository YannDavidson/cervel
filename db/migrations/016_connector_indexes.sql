BEGIN;
CREATE INDEX IF NOT EXISTS source_documents_cko_idx ON source_documents(cko_id);
CREATE INDEX IF NOT EXISTS source_sync_runs_status_idx ON source_sync_runs(status,started_at DESC);
COMMIT;
