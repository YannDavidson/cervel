BEGIN;

CREATE TABLE identity_accounts (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('oidc','passkey')),
  issuer text,
  subject text,
  email text,
  email_verified boolean NOT NULL DEFAULT false,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, provider, issuer, subject)
);

CREATE INDEX identity_accounts_email_idx ON identity_accounts(node_id, lower(email));

CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  principal_id uuid REFERENCES principals(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('oidc','passkey_register','passkey_authenticate')),
  state text UNIQUE,
  code_verifier text,
  challenge text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_challenges_lookup_idx ON auth_challenges(kind, state, expires_at) WHERE consumed_at IS NULL;

CREATE TABLE passkey_credentials (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_type text,
  backed_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX passkey_credentials_principal_idx ON passkey_credentials(node_id, principal_id);

CREATE TABLE capture_jobs (
  id uuid PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  principal_id uuid NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  cko_id uuid REFERENCES knowledge_objects(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('upload','clip','note')),
  status text NOT NULL CHECK (status IN ('queued','processing','ready','failed')),
  filename text,
  source_url text,
  mime_type text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX capture_jobs_inbox_idx ON capture_jobs(workspace_id, status, created_at DESC);

CREATE TABLE object_notes (
  id uuid PRIMARY KEY,
  cko_id uuid NOT NULL UNIQUE REFERENCES knowledge_objects(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by uuid REFERENCES principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
