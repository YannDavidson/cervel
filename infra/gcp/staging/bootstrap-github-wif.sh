#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is required}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-YannDavidson/cervel}"
POOL="${CERVEL_WIF_POOL:-github}"
PROVIDER="${CERVEL_WIF_PROVIDER:-cervel}"
DEPLOYER_NAME="${CERVEL_GCP_DEPLOYER_SA:-cervel-github-deployer}"
DEPLOYER_SA="${DEPLOYER_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$GCP_PROJECT_ID" >/dev/null
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com --project "$GCP_PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"

if ! gcloud iam workload-identity-pools describe "$POOL" --location=global --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --location=global --project "$GCP_PROJECT_ID" --display-name="GitHub Actions" >/dev/null
fi
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --project "$GCP_PROJECT_ID" --location=global --workload-identity-pool="$POOL" \
    --display-name="CERVEL GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPOSITORY}'" >/dev/null
fi

if ! gcloud iam service-accounts describe "$DEPLOYER_SA" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOYER_NAME" --project "$GCP_PROJECT_ID" --display-name="CERVEL GitHub Deployer" >/dev/null
fi

for role in roles/run.admin roles/iam.serviceAccountAdmin roles/iam.serviceAccountUser roles/serviceusage.serviceUsageAdmin roles/artifactregistry.admin roles/cloudsql.admin roles/secretmanager.admin roles/storage.admin roles/resourcemanager.projectIamAdmin roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" --member="serviceAccount:${DEPLOYER_SA}" --role="$role" --condition=None --quiet >/dev/null
done

WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPOSITORY}"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" --project "$GCP_PROJECT_ID" --role=roles/iam.workloadIdentityUser --member="$WIF_MEMBER" --quiet >/dev/null

PROVIDER_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
cat <<EOF
One-time GCP/GitHub federation is ready.

Set these GitHub repository or staging-environment variables:
GCP_PROJECT_ID=${GCP_PROJECT_ID}
GCP_REGION=us-central1
GCP_WORKLOAD_IDENTITY_PROVIDER=${PROVIDER_NAME}
GCP_DEPLOYER_SERVICE_ACCOUNT=${DEPLOYER_SA}
EOF
