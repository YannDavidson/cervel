# CERVEL Self-Contained Alpha Verification

`npm run cervel:verify` is the canonical developer verification command for an already bootstrapped local CERVEL alpha environment.

It removes the manual identity and token ceremony previously required by `alpha:golden-path`.

## Prerequisite

Run the developer bootstrap first:

```bash
npm ci
npm run cervel:setup
```

You can inspect the environment at any time with:

```bash
npm run cervel:doctor
```

## Run verification

```bash
npm run cervel:verify
```

The verifier automatically:

1. reads the non-secret developer setup state from `~/.cervel/developer/setup.json` (or `CERVEL_DEV_STATE_DIR`);
2. resolves the developer Vault path and Local Node URL;
3. resolves the Vault passphrase from `CERVEL_VAULT_PASSPHRASE` or the generated developer passphrase file;
4. unlocks the Vault in memory through the existing Vault primitive;
5. obtains the Local Node API token in memory without printing or persisting it;
6. starts the existing Local Node if the setup state exists but the API is not currently ready;
7. injects node, workspace, principal, storage, URL, and API token only into the child golden-path process;
8. runs the alpha golden-path verification;
9. verifies that the expected developer-level checks passed;
10. writes the report to `reports/golden-path/developer-verify.json` by default.

No manual `CERVEL_GOLDEN_*` variables or `CERVEL_LOCAL_API_TOKEN` are required.

## Security boundary

The verifier does not print the Local Node API token or Vault cryptographic material.

The API token is read from the unlocked Vault into process memory and passed only to the child verification process. It is not written into developer setup state or a new credential file.

The generated developer passphrase remains governed by the developer bootstrap contract. If setup used an explicitly supplied passphrase, the same `CERVEL_VAULT_PASSPHRASE` must be available when verification runs.

## What the developer verification exercises

The command exercises the current alpha golden-path runtime checks for:

- encrypted Vault/bootstrap presence;
- Local Node readiness;
- Local Node API boundary;
- browser evidence capture;
- duplicate detection;
- prompt-injection quarantine policy;
- mobile capture and receipt flow;
- hybrid retrieval;
- cited local reasoning;
- Intelligence Gateway local routing;
- answer-to-source Trace;
- canonical state digest;
- cloud-sync convergence drill;
- mobile capability revocation.

The command writes controlled alpha fixture data into the developer workspace. It does not perform the destructive backup/restore or portable-export release-qualification drills used by the dedicated CI golden-path workflow. Those remain CI responsibilities in this rollout because exporting a real developer Vault would create an unnecessary plaintext copy of user data.

## Failure behavior

If setup has not been completed, verification exits nonzero and instructs the developer to run:

```bash
npm run cervel:setup
```

If the runtime is unhealthy or the Vault cannot be unlocked, the verifier fails closed and directs the developer to:

```bash
npm run cervel:doctor
```

## Overrides

```text
CERVEL_DEV_STATE_DIR      Override developer setup-state directory
CERVEL_VAULT_PASSPHRASE  Provide the Vault passphrase when setup used an environment-supplied passphrase
CERVEL_DEV_DB_PORT        Preserve a non-default developer PostgreSQL host port when Local Node must be restarted
CERVEL_VERIFY_REPORT      Override the developer verification report path
```

## Relationship to the CI golden path

`cervel:verify` is the developer-facing self-contained verification entry point.

`.github/workflows/alpha-golden-path.yml` remains the broader release-qualification path. It uses an isolated CI Vault and additionally exercises encrypted backup, restart persistence, destructive restore, portable export, and final release qualification.

This separation keeps the local developer command safe for a real developer Vault while preserving the stronger clean-room CI gate.
