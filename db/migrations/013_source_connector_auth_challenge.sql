BEGIN;
ALTER TABLE auth_challenges DROP CONSTRAINT IF EXISTS auth_challenges_kind_check;
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_kind_check CHECK (kind IN ('oidc','passkey_register','passkey_authenticate','source_connector'));
COMMIT;
