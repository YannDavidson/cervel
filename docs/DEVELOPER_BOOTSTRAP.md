# CERVEL Developer Bootstrap

`npm run cervel:setup` is the canonical local developer bootstrap for the CERVEL alpha.

Its goal is simple: a developer with repository access, Node.js, npm, and Docker should be able to prepare and start a working local CERVEL runtime without manually discovering node identifiers, creating database containers, or running migration/bootstrap commands one by one.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker with a running daemon
- repository dependencies installed with `npm ci`

No cloud account or external model API key is required for the default local sovereign path.

## First run

```bash
git clone https://github.com/YannDavidson/cervel.git
cd cervel
npm ci
npm run cervel:setup
```

On a successful first run the bootstrap:

1. verifies Node.js, npm, and Docker;
2. creates `.env` from `.env.example` if `.env` does not exist;
3. creates a developer Vault;
4. creates a developer-only Vault passphrase when `CERVEL_VAULT_PASSPHRASE` is not supplied;
5. starts the Vault-scoped PostgreSQL 16 + pgvector container through the existing Local Node lifecycle;
6. runs database migrations;
7. runs the idempotent CERVEL database bootstrap;
8. starts the Local Node API;
9. waits for `/ready`;
10. writes a non-secret developer setup record for later tooling.

The final output includes the Vault path, Local Node URL, node ID, workspace ID, and developer setup state path.

## Diagnose a local environment

Use the read-only developer doctor whenever setup or startup behavior is unclear:

```bash
npm run cervel:doctor
```

The doctor inspects prerequisites, developer state, Vault/runtime consistency, PostgreSQL readiness, ports, and Local Node `/ready` without creating, repairing, starting, or stopping anything. Every blocking failure is reported with a concrete corrective action.

For the full diagnostics contract and machine-readable mode, see [`DEVELOPER_DOCTOR.md`](DEVELOPER_DOCTOR.md).

## Idempotency

The command is designed to be rerun.

If the developer Vault already exists, it is reused. The existing Local Node `start` lifecycle reuses or restarts the Vault-scoped database container as necessary, reruns upgrade-safe migrations and idempotent bootstrap, and returns immediately when the Local Node is already healthy.

The bootstrap must not create duplicate nodes, principals, workspaces, or primary storage locations on repeated runs.

## Default paths

The default developer Vault is:

```text
~/.cervel/vaults/developer
```

Developer bootstrap state is stored under:

```text
~/.cervel/developer
```

When the bootstrap generates a passphrase, it stores it at:

```text
~/.cervel/developer/bootstrap-passphrase
```

This file is outside the Vault and outside the repository. It is developer convenience state, not part of the Vault format. The Local Node API token remains encrypted inside the Vault and is never written to the developer setup record.

The non-secret setup record is:

```text
~/.cervel/developer/setup.json
```

It contains the Vault path, Local Node URL, node ID, workspace ID, principal ID, storage location ID, authority, passphrase source, and update timestamp. It does not contain the Vault content key, database password, Local Node API token, or private device key.

## Environment overrides

The bootstrap recognizes:

```text
CERVEL_VAULT_PASSPHRASE   Use an explicit Vault passphrase instead of generated developer state
CERVEL_DEV_VAULT          Override the developer Vault path
CERVEL_DEV_STATE_DIR      Override the developer bootstrap state directory
CERVEL_DEV_PORT           Override the Local Node port (default 8787)
CERVEL_DEV_DB_PORT        Override the Vault PostgreSQL host port (default 55432)
```

When `CERVEL_VAULT_PASSPHRASE` is supplied, the bootstrap does not persist that passphrase.

## Security boundary

The developer bootstrap is orchestration around the existing CERVEL Local Node and Vault primitives. It does not create a second runtime path or weaken the Vault format.

The following secrets remain governed by the Vault implementation:

- Vault content key
- database password
- Local Node API token
- device private key

Generated developer passphrase state exists only to make local alpha onboarding reproducible. Production or shared environments should provide their own passphrase and secret-management policy rather than relying on the developer convenience file.

## Expected success contract

A successful run should make these statements true:

```text
Node.js is supported
npm is available
Docker daemon is reachable
.env exists
Developer Vault exists and can be unlocked
Vault-scoped PostgreSQL + pgvector is running
Migrations are applied
Node/workspace/principal/storage bootstrap exists
Local Node responds successfully at /ready
Non-secret developer setup state is available
```

After setup, validate the environment with:

```bash
npm run cervel:doctor
```

Then launch the Desktop Alpha with:

```bash
npm run desktop:dev
```

## Failure behavior

The bootstrap fails closed with a non-zero exit code when a prerequisite or runtime stage fails. Errors should identify the failed stage and provide a concrete next action when the cause is a common local prerequisite, such as an unsupported Node.js version or Docker daemon not running.

## Scope of this rollout

This bootstrap establishes reproducible local initialization and startup. It does not yet replace the manual identity inputs expected by the full alpha golden-path runner. A subsequent verification rollout will consume this setup state and make the golden path self-contained for developers.
