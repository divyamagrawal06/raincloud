#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-raincloud-mvp}"
LOCATION="${AZURE_LOCATION:-eastus}"
STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-}"
QUEUE_NAME="${AZURE_STORAGE_QUEUE_NAME:-approved-worker-runs}"
INPUTS_CONTAINER_NAME="${AZURE_INPUTS_CONTAINER_NAME:-inputs}"
OUTPUTS_CONTAINER_NAME="${AZURE_OUTPUTS_CONTAINER_NAME:-outputs}"
ASSIGN_ROLES=1

usage() {
  cat <<'USAGE'
Provision the Azure Storage resources needed for the MVP Hermes handoff.

Authentication:
  Uses the active Azure CLI session from `az login`. It does not require or read
  service-principal secret environment variables.

Options:
  --resource-group <name>       Resource group to create/use. Default: rg-raincloud-mvp
  --location <region>           Azure region. Default: eastus
  --storage-account <name>      Storage account name. Default: deterministic name from subscription
  --queue-name <name>           Worker queue name. Default: approved-worker-runs
  --inputs-container <name>     Input blob container. Default: inputs
  --outputs-container <name>    Output blob container. Default: outputs
  --skip-role-assignment        Do not grant the signed-in user blob/queue data roles
  -h, --help                    Show this help

Example:
  bash infra/azure/provision-mvp.sh --resource-group rg-raincloud-dev --location eastus
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
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
    --queue-name)
      QUEUE_NAME="${2:-}"
      shift 2
      ;;
    --inputs-container)
      INPUTS_CONTAINER_NAME="${2:-}"
      shift 2
      ;;
    --outputs-container)
      OUTPUTS_CONTAINER_NAME="${2:-}"
      shift 2
      ;;
    --skip-role-assignment)
      ASSIGN_ROLES=0
      shift
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

if ! az account show >/dev/null 2>&1; then
  die "Azure CLI is not logged in. Run: az login"
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

if [[ -z "$STORAGE_ACCOUNT_NAME" ]]; then
  SUBSCRIPTION_SUFFIX="$(printf '%s' "$SUBSCRIPTION_ID" | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-8)"
  STORAGE_ACCOUNT_NAME="raincloud${SUBSCRIPTION_SUFFIX}mvp"
fi

[[ "$STORAGE_ACCOUNT_NAME" =~ ^[a-z0-9]{3,24}$ ]] || die "Storage account name must be 3-24 lowercase letters/numbers: $STORAGE_ACCOUNT_NAME"

if ! az bicep version >/dev/null 2>&1; then
  az bicep install >/dev/null
fi

echo "Using subscription: $SUBSCRIPTION_ID"
echo "Creating resource group: $RESOURCE_GROUP ($LOCATION)"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

echo "Deploying storage handoff resources: $STORAGE_ACCOUNT_NAME"
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters \
    location="$LOCATION" \
    storageAccountName="$STORAGE_ACCOUNT_NAME" \
    queueName="$QUEUE_NAME" \
    inputsContainerName="$INPUTS_CONTAINER_NAME" \
    outputsContainerName="$OUTPUTS_CONTAINER_NAME" \
  --output none

STORAGE_ACCOUNT_ID="$(az storage account show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT_NAME" \
  --query id \
  -o tsv)"

if [[ "$ASSIGN_ROLES" == "1" ]]; then
  ASSIGNEE_OBJECT_ID="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)"

  if [[ -n "$ASSIGNEE_OBJECT_ID" ]]; then
    for ROLE in "Storage Queue Data Contributor" "Storage Blob Data Contributor"; do
      az role assignment create \
        --assignee-object-id "$ASSIGNEE_OBJECT_ID" \
        --assignee-principal-type User \
        --role "$ROLE" \
        --scope "$STORAGE_ACCOUNT_ID" \
        --output none 2>/dev/null || true
    done
  else
    echo "Could not resolve signed-in user object id; skipping data-plane role assignment." >&2
    echo "Grant Storage Queue Data Contributor before running enqueue-worker-run.sh." >&2
  fi
fi

cat <<SUMMARY

Azure MVP handoff resources are ready.

Resource group:      $RESOURCE_GROUP
Location:            $LOCATION
Storage account:     $STORAGE_ACCOUNT_NAME
Worker queue:        $QUEUE_NAME
Inputs container:    $INPUTS_CONTAINER_NAME
Outputs container:   $OUTPUTS_CONTAINER_NAME

Next smoke command:
  bash infra/azure/enqueue-worker-run.sh --storage-account $STORAGE_ACCOUNT_NAME --queue-name $QUEUE_NAME

SUMMARY
