#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
: "${IMAGE_URI:?IMAGE_URI is required}"
GCP_REGION="${GCP_REGION:-us-central1}"
SQL_INSTANCE="${CERVEL_STAGING_SQL_INSTANCE:-cervel-staging-pg}"
DB_NAME="${CERVEL_STAGING_DB_NAME:-cervel}"
DB_USER="${CERVEL_STAGING_DB_USER:-cervel}"
BUCKET="${CERVEL_STAGING_BUCKET:-${GCP_PROJECT_ID}-cervel-staging}"
RUNTIME_SA_NAME="${CERVEL_STAGING_RUNTIME_SA:-cervel-staging-runtime}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
SERVICE="${CERVEL_STAGING_SERVICE:-cervel-staging}"
CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --format='value(connectionName)')"
SOCKET="/cloudsql/${CONNECTION_NAME}"

CORE_ENV="CERVEL_RUNTIME_MODE=staging,CERVEL_ENVIRONMENT_ID=staging,CERVEL_NODE_AUTHORITY=staging,CERVEL_NODE_NAME=CERVEL Staging,CERVEL_ALLOW_ALPHA_LOGIN=false,CERVEL_TRUST_PRINCIPAL_HEADER=false,CERVEL_STORAGE_MANAGED=true,DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${SOCKET},S3_ENDPOINT=https://storage.googleapis.com,S3_REGION=${GCP_REGION},S3_BUCKET=${BUCKET}"
CORE_SECRETS="DB_PASS=cervel-staging-db-password:latest,S3_ACCESS_KEY_ID=cervel-staging-s3-access-key:latest,S3_SECRET_ACCESS_KEY=cervel-staging-s3-secret-key:latest,CERVEL_CONNECTOR_TOKEN_KEY=cervel-staging-connector-token-key:latest,CERVEL_AUTOMATION_KEY=cervel-staging-automation-key:latest"

# Schema migration is an explicit release step and is serialized by the migration runner.
gcloud run jobs deploy cervel-staging-migrate --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --image "$IMAGE_URI" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$CONNECTION_NAME" --command node --args dist/scripts/db/migrate.js --set-env-vars "DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${SOCKET}" --set-secrets "DB_PASS=cervel-staging-db-password:latest" --tasks 1 --max-retries 0 --task-timeout 20m --quiet >/dev/null
gcloud run jobs execute cervel-staging-migrate --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --wait --quiet >/dev/null

# Bootstrap creates the staging Node, admin principal, default Workspace and primary storage location idempotently.
gcloud run jobs deploy cervel-staging-bootstrap --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --image "$IMAGE_URI" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$CONNECTION_NAME" --command node --args dist/scripts/db/bootstrap.js --set-env-vars "DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${SOCKET},CERVEL_NODE_AUTHORITY=staging,CERVEL_NODE_NAME=CERVEL Staging,CERVEL_BOOTSTRAP_ADMIN_SUBJECT=staging-bootstrap-admin" --set-secrets "DB_PASS=cervel-staging-db-password:latest" --tasks 1 --max-retries 0 --task-timeout 10m --quiet >/dev/null
gcloud run jobs execute cervel-staging-bootstrap --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --wait --quiet >/dev/null

sleep 3
BOOT_FILTER="resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"cervel-staging-bootstrap\" AND jsonPayload.event=\"cervel_bootstrap\""
NODE_ID="$(gcloud logging read "$BOOT_FILTER" --project "$GCP_PROJECT_ID" --freshness=15m --limit=1 --order=desc --format='value(jsonPayload.nodeId)')"
WORKSPACE_ID="$(gcloud logging read "$BOOT_FILTER" --project "$GCP_PROJECT_ID" --freshness=15m --limit=1 --order=desc --format='value(jsonPayload.workspaceId)')"
test -n "$NODE_ID" && test -n "$WORKSPACE_ID"

# First deploy uses an HTTPS placeholder only long enough to discover the stable Cloud Run URL.
gcloud run deploy "$SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --image "$IMAGE_URI" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$CONNECTION_NAME" --allow-unauthenticated --execution-environment gen2 --cpu 1 --memory 1Gi --concurrency 40 --min-instances 0 --max-instances 4 --timeout 300 --set-env-vars "${CORE_ENV},CERVEL_PUBLIC_BASE_URL=https://staging.invalid,CERVEL_AUTH_NODE_ID=${NODE_ID},CERVEL_AUTH_WORKSPACE_ID=${WORKSPACE_ID}" --set-secrets "$CORE_SECRETS" --quiet >/dev/null
SERVICE_URL="$(gcloud run services describe "$SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --format='value(status.url)')"
test -n "$SERVICE_URL"
HOST="${SERVICE_URL#https://}"

# Set real public origins and provider callback URLs after Cloud Run assigns the service URL.
gcloud run services update "$SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --update-env-vars "CERVEL_PUBLIC_BASE_URL=${SERVICE_URL},CERVEL_WEBAUTHN_ORIGIN=${SERVICE_URL},CERVEL_WEBAUTHN_RP_ID=${HOST},CERVEL_GOOGLE_DRIVE_REDIRECT_URI=${SERVICE_URL}/v1/connectors/google_drive/callback,CERVEL_DROPBOX_REDIRECT_URI=${SERVICE_URL}/v1/connectors/dropbox/callback,CERVEL_ONEDRIVE_REDIRECT_URI=${SERVICE_URL}/v1/connectors/onedrive/callback" --quiet >/dev/null

secret_exists(){ gcloud secrets describe "$1" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; }
if secret_exists cervel-staging-oidc-client-id; then
  OIDC_SECRET_ARG="CERVEL_OIDC_CLIENT_ID=cervel-staging-oidc-client-id:latest"
  if secret_exists cervel-staging-oidc-client-secret; then OIDC_SECRET_ARG+=",CERVEL_OIDC_CLIENT_SECRET=cervel-staging-oidc-client-secret:latest"; fi
  gcloud run services update "$SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --update-env-vars "CERVEL_OIDC_ISSUER=https://accounts.google.com,CERVEL_OIDC_REDIRECT_URI=${SERVICE_URL}/v1/auth/oidc/callback" --update-secrets "$OIDC_SECRET_ARG" --quiet >/dev/null
fi

# Provider credentials are optional until registered in the provider consoles; attach each complete pair when present.
for provider in google-drive dropbox onedrive; do
  case "$provider" in
    google-drive) cid=cervel-staging-google-drive-client-id; csec=cervel-staging-google-drive-client-secret; env_id=CERVEL_GOOGLE_DRIVE_CLIENT_ID; env_sec=CERVEL_GOOGLE_DRIVE_CLIENT_SECRET;;
    dropbox) cid=cervel-staging-dropbox-client-id; csec=cervel-staging-dropbox-client-secret; env_id=CERVEL_DROPBOX_CLIENT_ID; env_sec=CERVEL_DROPBOX_CLIENT_SECRET;;
    onedrive) cid=cervel-staging-onedrive-client-id; csec=cervel-staging-onedrive-client-secret; env_id=CERVEL_ONEDRIVE_CLIENT_ID; env_sec=CERVEL_ONEDRIVE_CLIENT_SECRET;;
  esac
  if secret_exists "$cid" && secret_exists "$csec"; then
    gcloud run services update "$SERVICE" --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --update-secrets "${env_id}=${cid}:latest,${env_sec}=${csec}:latest" --quiet >/dev/null
  fi
done

# Source synchronization job uses the same durable DB/storage/connector secrets.
gcloud run jobs deploy cervel-staging-source-sync --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --image "$IMAGE_URI" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$CONNECTION_NAME" --command node --args dist/workers/source-sync.js --set-env-vars "${CORE_ENV},CERVEL_PUBLIC_BASE_URL=${SERVICE_URL}" --set-secrets "$CORE_SECRETS" --tasks 1 --max-retries 1 --task-timeout 20m --quiet >/dev/null

# CKEP drain is the recovery path for pending/failed reactive dispatches.
gcloud run jobs deploy cervel-staging-ckep-drain --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --image "$IMAGE_URI" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$CONNECTION_NAME" --command node --args dist/scripts/ckep-drain.js --set-env-vars "DB_USER=${DB_USER},DB_NAME=${DB_NAME},INSTANCE_UNIX_SOCKET=${SOCKET},CERVEL_CKEP_DRAIN_LIMIT=100" --set-secrets "DB_PASS=cervel-staging-db-password:latest" --tasks 1 --max-retries 1 --task-timeout 10m --quiet >/dev/null

printf '%s\n' "CERVEL_STAGING_URL=${SERVICE_URL}" "CERVEL_NODE_ID=${NODE_ID}" "CERVEL_WORKSPACE_ID=${WORKSPACE_ID}" "GOOGLE_OIDC_CALLBACK=${SERVICE_URL}/v1/auth/oidc/callback" "GOOGLE_DRIVE_CALLBACK=${SERVICE_URL}/v1/connectors/google_drive/callback" "DROPBOX_CALLBACK=${SERVICE_URL}/v1/connectors/dropbox/callback" "ONEDRIVE_CALLBACK=${SERVICE_URL}/v1/connectors/onedrive/callback"
