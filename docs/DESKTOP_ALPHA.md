# CERVEL Desktop Alpha

CERVEL Desktop is the human interface to a CERVEL Local Node. It is not a second knowledge runtime.

## Boundary

The Electron renderer is sandboxed, context-isolated, and has no Node.js access. A narrow preload bridge sends typed operations to the main process. The main process retains the Vault passphrase and Local Node token in memory, adds loopback authorization headers, and calls the same HTTP protocol available to future headless, server, and edge clients. The renderer never receives the token, database credentials, content key, or device private key.

Desktop owns only Vault lifecycle actions, Local Node process supervision, tray behavior, encrypted provider preferences, and signed application updates. The Local Node owns knowledge objects, encrypted artifacts, ingestion, indexing, retrieval, reasoning, provenance, graph semantics, Context Packages, answers, and Trace.

## Alpha surfaces

- onboarding for new and existing encrypted Vaults;
- notes, files, sources, drag-and-drop ingestion, and activity;
- scoped hybrid search and cited local answers;
- answer-to-source Trace inspection and semantic graph;
- node health, database storage, indexing counts, backup, restore, and verification;
- deterministic offline reasoning plus local or OpenAI-compatible provider configuration.

## Security posture

- BrowserWindow uses sandbox, context isolation, and no Node integration.
- All Electron permission requests are denied by default.
- Navigation is fixed to packaged assets; external HTTPS links open in the system browser.
- Local Node binds to 127.0.0.1 and authenticates all non-health requests with a high-entropy Vault token.
- Provider configuration and API keys are encrypted with the Vault content key.
- A remote provider cannot be configured without explicit network permission.
- Vault locking terminates the API and database container and clears decrypted Desktop state.

PostgreSQL files remain protected by the host full-disk encryption boundary described in LOCAL_NODE.md.

## Builds, signing, and updates

The Desktop Alpha workflow type-checks, tests, and packages unsigned verification builds on macOS, Windows, and Linux for every PR. The Desktop Release workflow runs for desktop-v tags, fails closed when Apple or Windows signing material is missing, signs platform releases, and publishes update metadata to a draft GitHub release. Updates are checked at startup and every six hours, downloaded automatically, and installed on exit.

Required release secrets are MACOS_CERTIFICATE, MACOS_CERTIFICATE_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID, WINDOWS_CERTIFICATE, and WINDOWS_CERTIFICATE_PASSWORD.

## Development

Run npm ci and then npm run desktop:dev. Docker must be running because the Local Node alpha database is PostgreSQL 16 plus pgvector.

## Recovery

Desktop polls the readiness endpoint every five seconds while a Vault is open. Two consecutive failures trigger the idempotent start path. Stale PID files are removed, the database container is reused, migrations and bootstrap rerun safely, and Desktop waits for readiness before declaring recovery. A single-instance lock prevents two supervisors from racing over one Vault.
