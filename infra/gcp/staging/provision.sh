#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
GCP_REGION="${GCP_REGION:-us-central1}"
SQL_INSTANCE="${CERVEL_STAGING_SQL_INSTANCE:-cervel-staging-pg}"
SQL_TIER="${CERVEL_STAGING_SQL_TIER:-db-custom-1-3840}"
DB_NAME="${CERVEL_STAGING_DB_NAME:-cervel}"
DB_USER="${CERVEL_STAGING_DB_USER:-cervel}"
ARTIFACT_REPO="${CERVEL_STAGING_ARTIFACT_REPO:-cervel}"
BUCKET="${CERVEL_STAGING_BUCKET:-${GCP_PROJECT_ID}-cervel-staging}"
RUNTIME_SA_NAME="${CERVEL_STAGING_RUNTIME_SA:-cervel-staging-runtime}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

secret_exists(){ gcloud secrets describe "$1" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; }
ensure_secret(){ local name="$1" value="$2"; if ! secret_exists "$name"; then printf '%s' "$value" | gcloud secrets create "$name" --project "$GCP_PROJECT_ID" --replication-policy=automatic --data-file=- >/dev/null; fi; }
put_secret_value(){ local name="$1" value="$2"; if secret_exists "$name"; then printf '%s' "$value" | gcloud secrets versions add "$name" --project "$GCP_PROJECT_ID" --data-file=- >/dev/null; else printf '%s' "$value" | gcloud secrets create "$name" --project "$GCP_PROJECT_ID" --replication-policy=automatic --data-file=- >/dev/null; fi; }
secret_value(){ gcloud secrets versions access latest --secret "$1" --project "$GCP_PROJECT_ID"; }
random_secret(){ openssl rand -base64 48 | tr -d '\n'; }

gcloud config set project "$GCP_PROJECT_ID" >/dev/null
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com iamcredentials.googleapis.com cloudresourcemanager.googleapis.com logging.googleapis.com --project "$GCP_PROJECT_ID" >/dev/null

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" --location "$GCP_REGION" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$ARTIFACT_REPO" --repository-format=docker --location "$GCP_REGION" --project "$GCP_PROJECT_ID" --description="CERVEL staging images" >/dev/null
fi
if [[ -n "${GCP_DEPLOYER_SERVICE_ACCOUNT:-}" ]]; then
  gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO" \
    --location "$GCP_REGION" --project "$GCP_PROJECT_ID" \
    --member="serviceAccount:${GCP_DEPLOYER_SERVICE_ACCOUNT}" \
    --role=roles/artifactregistry.writer --quiet >/dev/null
fi

if ! gcloud iam service-accounts describe "$RUNTIME_SA" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" --project "$GCP_PROJECT_ID" --display-name="CERVEL Staging Runtime" >/dev/null
fi
for role in roles/cloudsql.client roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${RUNTIME_SA}" --role="$role" --condition=None --quiet >/dev/null
done

if ! gcloud storage buckets describe "gs://${BUCKET}" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --project "$GCP_PROJECT_ID" --location "$GCP_REGION" --uniform-bucket-level-access --public-access-prevention >/dev/null
fi
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member="serviceAccount:${RUNTIME_SA}" --role=roles/storage.objectAdmin --quiet >/dev/null

if ! gcloud sql instances describe "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud sql instances create "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --database-version=POSTGRES_16 --edition=ENTERPRISE --tier="$SQL_TIER" --region="$GCP_REGION" --assign-ip --storage-type=SSD --storage-size=20 --storage-auto-increase --availability-type=zonal --backup-start-time=05:00 --enable-point-in-time-recovery >/dev/null
fi
if ! gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" >/dev/null
fi

if secret_exists cervel-staging-db-password; then DB_PASSWORD="$(secret_value cervel-staging-db-password)"; else DB_PASSWORD="$(random_secret)"; ensure_secret cervel-staging-db-password "$DB_PASSWORD"; fi
if gcloud sql users list --instance "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --format='value(name)' | grep -Fxq "$DB_USER"; then
  gcloud sql users set-password "$DB_USER" --instance "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --password="$DB_PASSWORD" >/dev/null
else
  gcloud sql users create "$DB_USER" --instance "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --password="$DB_PASSWORD" >/dev/null
fi

ensure_secret cervel-staging-connector-token-key "$(random_secret)"
ensure_secret cervel-staging-automation-key "$(random_secret)"

if ! secret_exists cervel-staging-s3-access-key || ! secret_exists cervel-staging-s3-secret-key; then
  HMAC_JSON="$(gcloud storage hmac create "$RUNTIME_SA" --project "$GCP_PROJECT_ID" --format=json)"
  ACCESS_ID="$(printf '%s' "$HMAC_JSON" | jq -r '.metadata.accessId')"
  SECRET_KEY="$(printf '%s' "$HMAC_JSON" | jq -r '.secret')"
  test -n "$ACCESS_ID" && test "$ACCESS_ID" != null
  test -n "$SECRET_KEY" && test "$SECRET_KEY" != null
  put_secret_value cervel-staging-s3-access-key "$ACCESS_ID"
  put_secret_value cervel-staging-s3-secret-key "$SECRET_KEY"
fi

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" --project "$GCP_PROJECT_ID" --format='value(connectionName)')"
cat <<EOF
GCP_PROJECT_ID=${GCP_PROJECT_ID}
GCP_REGION=${GCP_REGION}
CLOUD_SQL_INSTANCE=${SQL_INSTANCE}
CLOUD_SQL_CONNECTION_NAME=${CONNECTION_NAME}
CERVEL_STAGING_BUCKET=${BUCKET}
CERVEL_STAGING_RUNTIME_SA=${RUNTIME_SA}
CERVEL_STAGING_ARTIFACT_REPO=${ARTIFACT_REPO}
EOF
