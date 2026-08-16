BEGIN;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS artifacts_current_cko_idx ON artifacts(cko_id,is_current) WHERE is_current=true;
COMMIT;
