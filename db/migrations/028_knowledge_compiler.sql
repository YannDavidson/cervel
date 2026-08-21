CREATE TABLE knowledge_sessions (
 id uuid PRIMARY KEY,node_id uuid NOT NULL REFERENCES nodes(id),workspace_id uuid NOT NULL REFERENCES workspaces(id),principal_id uuid NOT NULL REFERENCES principals(id),
 title text NOT NULL,mode text NOT NULL DEFAULT 'review' CHECK(mode IN('automatic','review','session_only')),status text NOT NULL DEFAULT 'open' CHECK(status IN('open','compiled','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX knowledge_sessions_scope_idx ON knowledge_sessions(node_id,workspace_id,principal_id,updated_at DESC);
CREATE TABLE knowledge_session_turns (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES knowledge_sessions(id) ON DELETE CASCADE,ordinal integer NOT NULL,role text NOT NULL CHECK(role IN('user','assistant','system')),
 content text NOT NULL,content_sha256 char(64) NOT NULL,answer_id uuid REFERENCES answers(id),source_cko_ids uuid[] NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(session_id,ordinal)
);
CREATE TABLE knowledge_compilation_runs (
 id uuid PRIMARY KEY,session_id uuid NOT NULL REFERENCES knowledge_sessions(id),node_id uuid NOT NULL REFERENCES nodes(id),workspace_id uuid NOT NULL REFERENCES workspaces(id),principal_id uuid NOT NULL REFERENCES principals(id),
 mode text NOT NULL CHECK(mode IN('automatic','review','session_only')),status text NOT NULL CHECK(status IN('running','awaiting_review','completed','failed')),input_digest char(64) NOT NULL,
 classification jsonb NOT NULL DEFAULT '{}',filing_suggestions jsonb NOT NULL DEFAULT '[]',receipt jsonb NOT NULL DEFAULT '{}',candidate_count integer NOT NULL DEFAULT 0,duplicate_count integer NOT NULL DEFAULT 0,contradiction_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,UNIQUE(session_id,input_digest,mode)
);
CREATE INDEX knowledge_compilation_runs_scope_idx ON knowledge_compilation_runs(node_id,workspace_id,created_at DESC);
CREATE TABLE knowledge_compilation_candidates (
 id uuid PRIMARY KEY,run_id uuid NOT NULL REFERENCES knowledge_compilation_runs(id) ON DELETE CASCADE,kind text NOT NULL CHECK(kind IN('claim','decision','task','insight','unresolved_question')),
 text text NOT NULL,fingerprint char(64) NOT NULL,semantic_key char(64) NOT NULL,polarity text NOT NULL CHECK(polarity IN('positive','negative')),confidence real NOT NULL CHECK(confidence BETWEEN 0 AND 1),source_turn_ordinals integer[] NOT NULL,
 status text NOT NULL CHECK(status IN('proposed','accepted','rejected','duplicate','contradicted','materialized')),duplicate_of uuid REFERENCES knowledge_compilation_candidates(id),contradiction_of uuid REFERENCES knowledge_compilation_candidates(id),materialized_cko_id uuid REFERENCES knowledge_objects(id),materialized_claim_id uuid REFERENCES claims(id),metadata jsonb NOT NULL DEFAULT '{}',UNIQUE(run_id,fingerprint)
);
CREATE INDEX knowledge_compilation_candidates_fingerprint_idx ON knowledge_compilation_candidates(fingerprint);
CREATE INDEX knowledge_compilation_candidates_semantic_idx ON knowledge_compilation_candidates(semantic_key,polarity);
CREATE TABLE knowledge_compilation_outputs(run_id uuid NOT NULL REFERENCES knowledge_compilation_runs(id) ON DELETE CASCADE,candidate_id uuid REFERENCES knowledge_compilation_candidates(id),resource_type text NOT NULL CHECK(resource_type IN('cko','claim','artifact')),resource_id uuid NOT NULL,PRIMARY KEY(run_id,resource_type,resource_id));
