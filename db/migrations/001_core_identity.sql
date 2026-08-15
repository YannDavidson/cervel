BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE cervel_principal_type AS ENUM
    ('human','team','organization','application','agent','model','node','service','public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cervel_lifecycle_status AS ENUM ('active','archived','deleted','tombstoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cervel_epistemic_status AS ENUM
    ('raw','extracted','inferred','claimed','corroborated','verified',
     'authoritative','disputed','superseded','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cervel_relationship_status AS ENUM
    ('inferred','suggested','confirmed','verified','disputed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cervel_artifact_role AS ENUM
    ('original','snapshot','extracted_text','thumbnail','translation',
     'transcript','structured','derived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE nodes (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  deployment_mode text NOT NULL CHECK (deployment_mode IN ('managed','private_cloud','on_prem','edge')),
  jurisdiction text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE principals (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  principal_type cervel_principal_type NOT NULL,
  display_name text NOT NULL,
  external_subject text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, external_subject)
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  slug text NOT NULL,
  name text NOT NULL,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, slug)
);

CREATE TABLE libraries (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id),
  workspace_id uuid REFERENCES workspaces(id),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  governance jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieval_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, slug)
);

COMMIT;
