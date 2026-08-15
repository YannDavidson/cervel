BEGIN;

ALTER TABLE claims ADD COLUMN IF NOT EXISTS semantic_subject_entity_id uuid REFERENCES entities(id);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS semantic_object_entity_id uuid REFERENCES entities(id);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS semantic_predicate text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS confidence_components jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE entities ADD COLUMN IF NOT EXISTS normalized_name text;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS resolution_confidence real CHECK (resolution_confidence IS NULL OR resolution_confidence BETWEEN 0 AND 1);
UPDATE entities SET normalized_name = lower(regexp_replace(trim(canonical_name), '\\s+', ' ', 'g')) WHERE normalized_name IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS entities_node_kind_normalized_uidx
  ON entities(node_id, kind, normalized_name)
  WHERE normalized_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS semantic_extractions (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  context_package_id uuid NOT NULL REFERENCES context_packages(id) ON DELETE RESTRICT,
  fragment_id uuid NOT NULL REFERENCES fragments(id) ON DELETE RESTRICT,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE RESTRICT,
  subject_entity_id uuid REFERENCES entities(id) ON DELETE RESTRICT,
  predicate text NOT NULL,
  object_entity_id uuid REFERENCES entities(id) ON DELETE RESTRICT,
  object_literal jsonb,
  extractor text NOT NULL,
  confidence real NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(context_package_id, fragment_id, claim_id)
);

CREATE TABLE IF NOT EXISTS graph_reasoning_runs (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  context_package_id uuid NOT NULL REFERENCES context_packages(id) ON DELETE RESTRICT,
  principal_id uuid NOT NULL REFERENCES principals(id),
  max_depth integer NOT NULL DEFAULT 2 CHECK (max_depth BETWEEN 1 AND 5),
  visited_claim_ids uuid[] NOT NULL DEFAULT '{}',
  visited_relationship_ids uuid[] NOT NULL DEFAULT '{}',
  confidence real CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS semantic_extractions_context_idx ON semantic_extractions(context_package_id, created_at);
CREATE INDEX IF NOT EXISTS claims_semantic_spo_idx ON claims(node_id, semantic_subject_entity_id, semantic_predicate, semantic_object_entity_id);
CREATE INDEX IF NOT EXISTS graph_reasoning_runs_context_idx ON graph_reasoning_runs(context_package_id, created_at DESC);

COMMIT;
