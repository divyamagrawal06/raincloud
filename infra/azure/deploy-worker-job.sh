#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-raincloud-mvp}"
LOCATION="${AZURE_LOCATION:-eastus}"
STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-}"
QUEUE_NAME="${AZURE_STORAGE_QUEUE_NAME:-approved-worker-runs}"
INPUTS_CONTAINER_NAME="${AZURE_INPUTS_CONTAINER_NAME:-inputs}"
OUTPUTS_CONTAINER_NAME="${AZURE_OUTPUTS_CONTAINER_NAME:-outputs}"
ACR_NAME="${AZURE_CONTAINER_REGISTRY_NAME:-}"
ENVIRONMENT_NAME="${AZURE_CONTAINER_APPS_ENVIRONMENT_NAME:-raincloud-mvp-env}"
JOB_NAME="${AZURE_HERMES_JOB_NAME:-hermes-worker-job}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
BUDGET_NAME="${AZURE_BUDGET_NAME:-raincloud-mvp-20-usd}"
WORKER_CALLBACK_SECRET="${RAINCLOUD_WORKER_CALLBACK_SECRET:-}"
WORKER_CALLBACK_SECRET_NAME="raincloud-worker-callback-secret"

usage() {
  cat <<'USAGE'
Build and deploy the MVP Hermes worker as a manual Azure Container Apps Job.

Authentication:
  Uses the active Azure CLI session from `az login`. No service-principal secret
  variables are required.

Options:
  --resource-group <name>   Resource group to create/use. Default: rg-raincloud-mvp
  --location <region>       Azure region. Default: eastus
  --storage-account <name>  Storage account name. Default: deterministic name from subscription
  --acr-name <name>         Azure Container Registry name. Default: deterministic name from subscription
  --environment <name>      Container Apps environment. Default: raincloud-mvp-env
  --job-name <name>         Container Apps Job name. Default: hermes-worker-job
  --image-tag <tag>         Image tag. Default: current git sha
  -h, --help                Show this help

Example:
  bash infra/azure/deploy-worker-job.sh --resource-group rg-raincloud-dev --location eastus
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

az_file_path() {
  if command -v wslpath >/dev/null 2>&1 && [[ "$1" == /* ]]; then
    wslpath -w "$1"
    return
  fi

  printf '%s' "$1"
}

create_budget_alert() {
  local contact_email
  contact_email="$(az account show --query user.name -o tsv | tr -d '\r')"

  local END_DATE
  END_DATE="$(date -u -d '+1 year' +%Y-%m-01 2>/dev/null || date -u -v+1y +%Y-%m-01)T00:00:00Z"

  local budget_body
  budget_body="$(cat <<JSON
{
  "properties": {
    "category": "Cost",
    "amount": 20,
    "timeGrain": "Monthly",
    "timePeriod": {
      "startDate": "$(date -u +%Y-%m-01)T00:00:00Z",
      "endDate": "$END_DATE"
    },
    "filter": {
      "dimensions": {
        "name": "ResourceGroupName",
        "operator": "In",
        "values": ["$RESOURCE_GROUP"]
      }
    },
    "notifications": {
      "actual_GreaterThan_80_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 80,
        "contactEmails": ["$contact_email"]
      },
      "actual_GreaterThan_100_Percent": {
        "enabled": true,
        "operator": "GreaterThan",
        "threshold": 100,
        "contactEmails": ["$contact_email"]
      }
    }
  }
}
JSON
)"

  az rest \
    --method put \
    --url "https://management.azure.com/subscriptions/$SUBSCRIPTION_ID/providers/Microsoft.Consumption/budgets/$BUDGET_NAME?api-version=2023-11-01" \
    --body "$budget_body" \
    --output none 2>/dev/null || true
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resource-group)
      RESOURCE_GROUP="${2:-}"
      shift 2
      ;;
    --location)
      LOCATION="${2:-}"
      shift 2
      ;;
    --storage-account)
      STORAGE_ACCOUNT_NAME="${2:-}"
      shift 2
      ;;
    --acr-name)
      ACR_NAME="${2:-}"
      shift 2
      ;;
    --environment)
      ENVIRONMENT_NAME="${2:-}"
      shift 2
      ;;
    --job-name)
      JOB_NAME="${2:-}"
      shift 2
      ;;
    --image-tag)
      IMAGE_TAG="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

require_command az
require_command npm

if ! az account show >/dev/null 2>&1; then
  die "Azure CLI is not logged in. Run: az login"
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv | tr -d '\r')"
SUBSCRIPTION_SUFFIX="$(printf '%s' "$SUBSCRIPTION_ID" | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-8)"

if [[ -z "$STORAGE_ACCOUNT_NAME" ]]; then
  STORAGE_ACCOUNT_NAME="raincloud${SUBSCRIPTION_SUFFIX}mvp"
fi

if [[ -z "$ACR_NAME" ]]; then
  ACR_NAME="raincloud${SUBSCRIPTION_SUFFIX}acr"
fi

[[ "$ACR_NAME" =~ ^[a-zA-Z0-9]{5,50}$ ]] || die "ACR name must be 5-50 letters/numbers: $ACR_NAME"
[[ "$JOB_NAME" =~ ^[a-z][a-z0-9-]{0,30}[a-z0-9]$ ]] || die "Container Apps Job name must be lowercase, <=32 chars, and start with a letter: $JOB_NAME"

for PROVIDER in Microsoft.Storage Microsoft.ContainerRegistry Microsoft.App; do
  echo "Registering provider: $PROVIDER"
  az provider register --namespace "$PROVIDER" --wait --output none
done

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags app=raincloud environment=mvp spendLimitUsd=20 \
  --output none

create_budget_alert

bash "$SCRIPT_DIR/provision-mvp.sh" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --storage-account "$STORAGE_ACCOUNT_NAME" \
  --queue-name "$QUEUE_NAME" \
  --inputs-container "$INPUTS_CONTAINER_NAME" \
  --outputs-container "$OUTPUTS_CONTAINER_NAME"

az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled false \
  --location "$LOCATION" \
  --output none

IMAGE_NAME="hermes-worker:$IMAGE_TAG"
ACR_LOGIN_SERVER="$(az acr show --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --query loginServer -o tsv | tr -d '\r')"
AZ_REPO_ROOT="$(az_file_path "$REPO_ROOT")"

npm --workspace @raincloud/worker run build

az acr build \
  --registry "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_NAME" \
  --file apps/worker/Dockerfile \
  "$AZ_REPO_ROOT"

az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT_NAME" \
  --location "$LOCATION" \
  --logs-destination none \
  --output none

FULL_IMAGE="$ACR_LOGIN_SERVER/$IMAGE_NAME"
CALLBACK_ENV_VARS=()
CALLBACK_SECRET_ARGS=()

if [[ -n "$WORKER_CALLBACK_SECRET" ]]; then
  CALLBACK_ENV_VARS+=("RAINCLOUD_WORKER_CALLBACK_SECRET=secretref:$WORKER_CALLBACK_SECRET_NAME")
  CALLBACK_SECRET_ARGS+=(--secrets "$WORKER_CALLBACK_SECRET_NAME=$WORKER_CALLBACK_SECRET")
fi

if az containerapp job show --resource-group "$RESOURCE_GROUP" --name "$JOB_NAME" >/dev/null 2>&1; then
  if [[ -n "$WORKER_CALLBACK_SECRET" ]]; then
    az containerapp job secret set \
      --resource-group "$RESOURCE_GROUP" \
      --name "$JOB_NAME" \
      --secrets "$WORKER_CALLBACK_SECRET_NAME=$WORKER_CALLBACK_SECRET" \
      --output none
  fi

  az containerapp job update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$JOB_NAME" \
    --image "$FULL_IMAGE" \
    --cpu 0.5 \
    --memory 1.0Gi \
    --replica-timeout 600 \
    --replica-retry-limit 0 \
    --parallelism 1 \
    --replica-completion-count 1 \
    --set-env-vars \
      AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT_NAME" \
      AZURE_STORAGE_QUEUE_NAME="$QUEUE_NAME" \
      "${CALLBACK_ENV_VARS[@]}" \
    --output none
else
  az containerapp job create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$JOB_NAME" \
    --environment "$ENVIRONMENT_NAME" \
    --trigger-type Manual \
    --image "$FULL_IMAGE" \
    --cpu 0.5 \
    --memory 1.0Gi \
    --replica-timeout 600 \
    --replica-retry-limit 0 \
    --parallelism 1 \
    --replica-completion-count 1 \
    --mi-system-assigned \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-identity system \
    "${CALLBACK_SECRET_ARGS[@]}" \
    --env-vars \
      AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT_NAME" \
      AZURE_STORAGE_QUEUE_NAME="$QUEUE_NAME" \
      "${CALLBACK_ENV_VARS[@]}" \
    --output none
fi

PRINCIPAL_ID="$(az containerapp job identity show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$JOB_NAME" \
  --query principalId \
  -o tsv | tr -d '\r')"
STORAGE_ACCOUNT_ID="$(az storage account show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT_NAME" \
  --query id \
  -o tsv | tr -d '\r')"
ACR_ID="$(az acr show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --query id \
  -o tsv | tr -d '\r')"

for ROLE in "AcrPull" "Storage Queue Data Contributor" "Storage Blob Data Contributor"; do
  SCOPE="$STORAGE_ACCOUNT_ID"
  if [[ "$ROLE" == "AcrPull" ]]; then
    SCOPE="$ACR_ID"
  fi

  az role assignment create \
    --assignee-object-id "$PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal \
    --role "$ROLE" \
    --scope "$SCOPE" \
    --output none 2>/dev/null || true
done

az containerapp job registry set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$JOB_NAME" \
  --server "$ACR_LOGIN_SERVER" \
  --identity system \
  --output none

cat <<SUMMARY

Hermes worker job is deployed.

Resource group:        $RESOURCE_GROUP
Location:              $LOCATION
Storage account:       $STORAGE_ACCOUNT_NAME
Queue:                 $QUEUE_NAME
ACR:                   $ACR_NAME
Container Apps env:    $ENVIRONMENT_NAME
Job:                   $JOB_NAME
Image:                 $FULL_IMAGE
Budget alert:          $BUDGET_NAME (best-effort, not a hard cap)

Run smoke:
  bash infra/azure/run-pdf-merge-smoke.sh --resource-group $RESOURCE_GROUP --storage-account $STORAGE_ACCOUNT_NAME --job-name $JOB_NAME

SUMMARY
