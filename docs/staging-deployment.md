# CERVEL Staging Deployment

CERVEL Staging is the first persistent managed deployment of the full CERVEL stack. It is intentionally isolated from future production resources.

## Managed topology

- Cloud Run service: CERVEL API + Knowledge Intelligence Workspace
- Cloud SQL PostgreSQL 16 + pgvector
- Google Cloud Storage bucket accessed through the Cloud Storage XML/S3 interoperability endpoint
- Secret Manager for DB, storage HMAC, connector encryption, automation and optional OAuth credentials
- Artifact Registry for immutable images tagged by Git SHA
- Cloud Run migration job
- Cloud Run bootstrap job
- Cloud Run source-sync job
- Cloud Run CKEP recovery/drain job
- GitHub Actions authentication through Workload Identity Federation (no long-lived GCP JSON key)

## One-time prerequisite

A Google Cloud project with billing enabled is required. From an authenticated Cloud Shell or local gcloud session with project/IAM administration privileges:

```bash
export GCP_PROJECT_ID=<your-staging-project-id>
bash infra/gcp/staging/bootstrap-github-wif.sh
```

Take the four printed values and create GitHub repository variables (or variables in the `staging` environment):

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOYER_SERVICE_ACCOUNT`

Then run the `Deploy CERVEL Staging` workflow with `provision=true`.

## What the workflow does

1. Authenticates GitHub Actions to GCP through OIDC/WIF.
2. Enables required APIs and idempotently provisions Artifact Registry, runtime service account, Cloud Storage and Cloud SQL.
3. Creates random staging DB/storage/automation secrets directly in Secret Manager.
4. Builds one immutable image tagged with the Git commit and pushes it to Artifact Registry.
5. Runs schema migrations as an explicit Cloud Run Job.
6. Runs the CERVEL bootstrap job and resolves the resulting Node + default Workspace IDs from structured logs.
7. Deploys the Cloud Run service connected to the Cloud SQL Unix socket.
8. Resolves the real HTTPS Cloud Run URL and updates CERVEL public origin/WebAuthn/callback configuration.
9. Deploys source-sync and CKEP drain recovery jobs.
10. Executes `/live` and database-backed `/ready` smoke tests and runs both background jobs once.

## OAuth registration boundary

OAuth clients are owned by their respective providers and are not created by CERVEL's deployment workflow. After the first staging deployment, the workflow summary prints the exact callback URLs to register.

For Google OIDC, store provider values in Secret Manager as:

- `cervel-staging-oidc-client-id`
- `cervel-staging-oidc-client-secret` (when the client type requires one)

For source connectors:

- `cervel-staging-google-drive-client-id`
- `cervel-staging-google-drive-client-secret`
- `cervel-staging-dropbox-client-id`
- `cervel-staging-dropbox-client-secret`
- `cervel-staging-onedrive-client-id`
- `cervel-staging-onedrive-client-secret`

Rerun the staging workflow after adding provider credentials so the deployment attaches them.

## Live acceptance sequence

The staging deployment is not considered complete until a human performs this live sequence:

1. Open the staging URL and complete OIDC login.
2. Create/upload a real artifact and verify the original bytes persist in Cloud Storage.
3. Verify CKO, CKURI, fragments, provenance and graph views.
4. Ask CERVEL and inspect CCP-backed answer Trace.
5. Connect a test Google Drive account and ingest a folder/file.
6. Modify the connected source and run source-sync.
7. Verify version creation → Knowledge Evolution → CKEP journal → Impact → Watch.
8. Verify an authorized Agent receives the standardized CKEP-backed signal.
9. Execute CKEP drain again and prove redispatch is idempotent.
10. Redeploy/restart Cloud Run and verify all knowledge survives the stateless service lifecycle.

## Separation rule

Staging and production must never share Cloud SQL instances, buckets, OAuth clients, encryption keys, service accounts or CKEP journals. Production promotion will reuse the deployment pattern, not the staging resources.
