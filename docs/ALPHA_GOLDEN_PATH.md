# CERVEL Alpha Golden Path

The Alpha Golden Path is CERVEL's executable product promise: a user can create an encrypted local Vault, capture evidence from desktop-adjacent, browser, and mobile surfaces, retrieve it without cloud authority, produce a cited answer, inspect its Trace, restart, synchronize optional encrypted state, revoke a device, back up, restore, and export the same knowledge.

## Release gate

`Alpha Golden Path` runs on every pull request to `main`. It uses the shipped CLI and public Local Node APIs; it does not call database helpers to manufacture success. The JSON and HTML evidence reports are uploaded from every run.

| Phase | Proof |
|---|---|
| Vault and node | `cervel init`, `start`, `/ready`, and `/v1/local/overview` |
| Local ingestion | Note artifact plus browser and mobile evidence fixtures |
| Evidence safety | Duplicate detection and `never_execute` provenance for captured instructions |
| Knowledge loop | Local search, cited answer, and complete Answer → Claim → Fragment → Artifact → Source Trace |
| Durability | Process/container restart followed by retrieval of the same answer and Trace |
| Optional sync | Two offline devices, deterministic conflict convergence, persisted restart, and revoked-device rejection |
| Recovery | Encrypted backup digest, artifact verification, destructive database restore, and post-restore Trace |
| Portability | Plain JSON, JSONL, artifacts, and PostgreSQL SQL export |

Run the unit-level contract locally with `npm run test:golden-path`. The complete acceptance workflow requires Docker and is intentionally executed by GitHub Actions.

## Qualification boundary

The automated gate proves Linux CI behavior with the real Local Node runtime. It must never imply that platform signing or physical-device delivery has been validated. Those are independent Alpha release qualifications:

- **Signed artifacts:** notarized macOS, signed Windows, and packaged Linux builds with update verification.
- **Real devices:** Chrome/Firefox/Safari and iOS/Android capture runs on supported hardware and OS versions.

Their evidence remains `pending` in an automated Golden Path report until the corresponding release qualification is performed and attached. The policy is recorded in `config/alpha-release-qualification.json`.

## Pass condition

The automated tier passes only when every check in `REQUIRED_GOLDEN_CHECKS` has evidence. A missing restart, restore, citation, Trace link, revocation, integrity check, or portable export fails the workflow.
