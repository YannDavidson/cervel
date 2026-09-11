# CERVEL Developer Doctor

`npm run cervel:doctor` is the read-only diagnostics command for the local developer environment.

It answers one question: **is this machine ready to run the CERVEL developer experience, and if not, what exactly should the developer fix?**

## Usage

```bash
npm run cervel:doctor
```

Machine-readable output is available for CI and tooling:

```bash
npm run cervel:doctor -- --json
```

The command exits with status `0` when there are no blocking failures and status `1` when one or more blocking failures are present. Warnings do not fail the command.

## Non-mutating contract

The doctor must not:

- create a Vault;
- create or modify `.env`;
- start or stop Docker containers;
- run migrations;
- run database bootstrap;
- start or stop the Local Node;
- rewrite developer setup state;
- generate or recover secrets.

Repairs belong to explicit commands such as `npm run cervel:setup`. The doctor observes and explains.

## Checks

The current doctor inspects:

- Node.js version (20+);
- npm availability;
- Docker daemon availability;
- repository-root detection;
- `.env.example` presence;
- `.env` presence;
- Electron/Desktop dependency installation;
- developer `setup.json` existence and format;
- developer Vault manifest existence and database metadata;
- setup/Vault authority consistency;
- developer passphrase-source expectations without printing the passphrase;
- runtime `bootstrap.json` existence;
- node/workspace/principal/storage identity consistency between setup state and runtime bootstrap state;
- Vault-scoped PostgreSQL container state;
- `pg_isready` inside the container;
- developer database port reachability;
- Local Node `/ready` reachability.

## Output levels

`✓` / `pass` means the check is healthy.

`!` / `warn` means the developer can continue, but the environment is incomplete or deserves attention.

`✗` / `fail` means the local developer environment is not healthy enough to claim readiness. Every actionable failure should include a concrete fix.

## Expected clean-machine behavior

Before bootstrap, this is intentionally a failure:

```text
✗ Developer setup: No setup state ...
  Fix: Run npm run cervel:setup.

FAIL — 1 blocking issue(s), ...
```

That is not a crash. It is the doctor correctly identifying an uninitialized developer environment.

After:

```bash
npm run cervel:setup
npm run cervel:doctor
```

the expected result is:

```text
PASS — 0 blocking issue(s), 0 warning(s)
```

assuming dependencies are installed and the CERVEL Local Node remains healthy.

## Security boundary

The doctor does not unlock the Vault and never reads or prints:

- the Local Node API token;
- the Vault content key;
- the database password;
- the device private key;
- the generated developer passphrase contents.

It only checks whether expected non-secret state and, when applicable, a generated passphrase file are present.

## Environment overrides

The doctor follows the same developer-path overrides as bootstrap:

- `CERVEL_DEV_VAULT`
- `CERVEL_DEV_STATE_DIR`
- `CERVEL_DEV_PORT`
- `CERVEL_DEV_DB_PORT`

This keeps diagnostics aligned with the environment actually created by `cervel:setup`.

## CI acceptance gate

The Developer Doctor integration workflow must prove both sides of the contract on a fresh Ubuntu runner:

1. before setup, doctor exits nonzero and identifies missing developer setup;
2. `npm run cervel:setup` succeeds;
3. after setup, doctor exits zero and reports no blocking issues;
4. JSON output is structurally valid and reports `ok: true`;
5. the environment is cleaned up explicitly after validation.
