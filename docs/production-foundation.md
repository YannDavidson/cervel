# CERVEL Production Foundation

PR #17 establishes the deployment contract for managed CERVEL environments without making CERVEL cloud-dependent.

## Topology

- CERVEL API / Workspace: stateless container service (Cloud Run target)
- PostgreSQL 16 + pgvector: durable knowledge, identity, graph, CCP and CKEP state
- S3-compatible object storage: artifact bytes
- Migration job: explicit pre-deploy database migration
- Source Sync job: connector delta synchronization
- CKEP Drain job: retry/recovery for undispatched or failed journal entries
- Secret manager: database, storage, OAuth, connector encryption and automation secrets

## Release order

1. Build one immutable container image from a validated Git commit.
2. Run the same 16 regression lanes plus Production Foundation Integration.
3. Deploy the image to staging with zero production secrets in source control.
4. Run the migration job once.
5. Shift staging traffic and run `/live` + `/ready` smoke checks.
6. Exercise authenticated Workspace, ingestion, retrieval, Trace, connector and CKEP paths.
7. Promote the exact image digest to production after approval.
8. Run production migration before shifting traffic.
9. Preserve the previous Cloud Run revision for rollback.

## Security boundary

Managed staging/production fail startup when alpha login or trusted principal-header authentication is enabled. Internet-facing routes must resolve principals through the real session/OIDC/passkey boundary. Secrets are injected at runtime and never baked into images.

## Sovereignty

This deployment is one hosting mode. CKO, CKURI, CCP and CKEP remain provider-neutral, and future Local Node / Vault deployments must be able to run without CERVEL Cloud.
