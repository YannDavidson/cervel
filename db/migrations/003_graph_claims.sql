BEGIN;

CREATE TABLE entities (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  kind text NOT NULL,
  canonical_name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  canonical_cko_id uuid REFERENCES knowledge_objects(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entities_name_fts_idx
  ON entities USING gin (to_tsvector('simple', canonical_name || ' ' || array_to_string(aliases,' ')));

CREATE TABLE relationships (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  source_type text NOT NULL CHECK (source_type IN ('cko','entity','claim','principal','library')),
  source_id uuid NOT NULL,
  predicate text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('cko','entity','claim','principal','library')),
  target_id uuid NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status cervel_relationship_status NOT NULL,
  confidence real CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX relationships_source_idx ON relationships(node_id, source_type, source_id, predicate);
CREATE INDEX relationships_target_idx ON relationships(node_id, target_type, target_id, predicate);

CREATE TABLE claims (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  subject_type text NOT NULL CHECK (subject_type IN ('cko','entity','claim')),
  subject_id uuid NOT NULL,
  predicate text NOT NULL,
  object_kind text NOT NULL CHECK (object_kind IN ('reference','literal')),
  object_ref_type text,
  object_ref_id uuid,
  literal_value jsonb,
  literal_datatype text,
  qualifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status cervel_epistemic_status NOT NULL,
  confidence real CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (object_kind='reference' AND object_ref_id IS NOT NULL AND literal_value IS NULL)
    OR
    (object_kind='literal' AND object_ref_id IS NULL AND literal_value IS NOT NULL)
  )
);

CREATE TABLE claim_evidence (
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  fragment_id uuid NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
  evidence_role text NOT NULL DEFAULT 'support'
    CHECK (evidence_role IN ('support','contradict','source')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(claim_id, fragment_id, evidence_role)
);

CREATE TABLE relationship_evidence (
  relationship_id uuid NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  fragment_id uuid NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(relationship_id, fragment_id)
);

CREATE INDEX claims_subject_idx ON claims(node_id, subject_type, subject_id, predicate);

COMMIT;
