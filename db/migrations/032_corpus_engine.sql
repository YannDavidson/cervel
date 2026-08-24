BEGIN;

CREATE TABLE corpus_definitions (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  corpus_key text NOT NULL CHECK(corpus_key ~ '^[a-z][a-z0-9-]{1,63}$'),
  title text NOT NULL,
  description text NOT NULL,
  engine_version text NOT NULL DEFAULT '1.0',
  built_in boolean NOT NULL DEFAULT false,
  extension_of_id uuid REFERENCES corpus_definitions(id),
  visibility text NOT NULL CHECK(visibility IN ('public','node','restricted','private')),
  taxonomy jsonb NOT NULL CHECK(jsonb_typeof(taxonomy)='array'),
  classification_rules jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(classification_rules)='array'),
  owner_principal_id uuid REFERENCES principals(id),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id,workspace_id,corpus_key)
);

CREATE TABLE corpus_access_grants (
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  access_level text NOT NULL CHECK(access_level IN ('view','classify','manage')),
  granted_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(corpus_id,principal_id)
);

CREATE TABLE corpus_memberships (
  id uuid PRIMARY KEY,
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  mega_tab text NOT NULL,
  tab text NOT NULL,
  subtab text NOT NULL DEFAULT '',
  membership_source text NOT NULL CHECK(membership_source IN ('manual','automatic','hook','import')),
  confidence real NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  reasons jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(reasons)='array'),
  classified_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(corpus_id,cko_id,mega_tab,tab,subtab)
);

CREATE TABLE corpus_classification_hooks (
  id uuid PRIMARY KEY,
  corpus_id uuid NOT NULL REFERENCES corpus_definitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL CHECK(event_type IN ('cko.created','cko.updated','compiler.completed','capture.ingested','manual')),
  matcher jsonb NOT NULL,
  target_coordinate jsonb NOT NULL,
  minimum_confidence real NOT NULL DEFAULT .5 CHECK(minimum_confidence BETWEEN 0 AND 1),
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(corpus_id,name)
);

CREATE TABLE corpus_classification_receipts (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cko_id uuid NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  engine_version text NOT NULL,
  input_digest char(64) NOT NULL CHECK(input_digest ~ '^[0-9a-f]{64}$'),
  candidates jsonb NOT NULL,
  accepted_membership_ids uuid[] NOT NULL DEFAULT '{}',
  trigger_event text NOT NULL,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW corpus_cko_semantic_view AS
SELECT cd.node_id, cd.workspace_id, cd.id corpus_id, cd.corpus_key, cd.title corpus_title, cd.visibility,
       cm.mega_tab, cm.tab, cm.subtab, cm.membership_source, cm.confidence, cm.reasons,
       ko.id cko_id, ko.type cko_type, ko.title cko_title, ko.summary cko_summary,
       ko.lifecycle_status, ko.object_version, ko.updated_at cko_updated_at
FROM corpus_memberships cm
JOIN corpus_definitions cd ON cd.id=cm.corpus_id AND cd.enabled=true
JOIN knowledge_objects ko ON ko.id=cm.cko_id AND ko.node_id=cd.node_id
WHERE ko.lifecycle_status<>'deleted';

CREATE INDEX corpus_definitions_scope_idx ON corpus_definitions(node_id,workspace_id,enabled,corpus_key);
CREATE INDEX corpus_memberships_cko_idx ON corpus_memberships(cko_id,corpus_id);
CREATE INDEX corpus_memberships_view_idx ON corpus_memberships(corpus_id,mega_tab,tab,subtab,confidence DESC);
CREATE INDEX corpus_receipts_cko_time_idx ON corpus_classification_receipts(cko_id,created_at DESC);
ALTER TABLE corpus_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_classification_receipts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE corpus_memberships IS 'Semantic coordinates only. CKO content and artifacts remain canonical and are never copied into a corpus.';
COMMIT;
