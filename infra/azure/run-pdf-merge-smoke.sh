#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"

RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-raincloud-mvp}"
STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-}"
QUEUE_NAME="${AZURE_STORAGE_QUEUE_NAME:-approved-worker-runs}"
JOB_NAME="${AZURE_HERMES_JOB_NAME:-hermes-worker-job}"
PAYLOAD_FILE="fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json"
SMOKE_PAYLOAD_FILE=".tmp/pdf-merge-smoke-payload.approved.json"
SMOKE_CALLBACK_URL="${RAINCLOUD_WORKER_SMOKE_CALLBACK_URL:-https://httpbingo.org/status/202}"
SMOKE_CALLBACK_SECRET="${RAINCLOUD_WORKER_SMOKE_CALLBACK_SECRET:-raincloud-smoke-callback-secret}"
SEED_DIR=".tmp/pdf-merge-inputs"
OUTPUT_FILE=".tmp/merged-q1-q3-q2-q4-packet.pdf"
OUTPUT_CONTAINER="outputs"
OUTPUT_FILE_WAS_SET=0

usage() {
  cat <<'USAGE'
Run the PDF merge cloud smoke test.

The script:
  1. Generates seven seed PDFs locally.
  2. Uploads them to the Azure inputs container.
  3. Enqueues the approved worker payload with a smoke callback target.
  4. Starts the manual Hermes worker Container Apps Job.
  5. Downloads the merged PDF artifact.

Options:
  --resource-group <name>   Resource group. Default: rg-raincloud-mvp
  --storage-account <name>  Storage account name. Required unless AZURE_STORAGE_ACCOUNT_NAME is set.
  --queue-name <name>       Queue name. Default: approved-worker-runs
  --job-name <name>         Container Apps Job name. Default: hermes-worker-job
  --payload <path>          Approved payload fixture. Default: fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json
  --callback-url <url>      Worker callback URL. Default: https://httpbingo.org/status/202
  --output <path>           Local merged PDF output path. Default: .tmp/merged-q1-q3-q2-q4-packet.pdf
  -h, --help                Show this help
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

resolve_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi

  if command -v node.exe >/dev/null 2>&1; then
    command -v node.exe
    return
  fi

  die "Missing required command: node"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resource-group)
      RESOURCE_GROUP="${2:-}"
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
    --job-name)
      JOB_NAME="${2:-}"
      shift 2
      ;;
    --payload)
      PAYLOAD_FILE="${2:-}"
      shift 2
      ;;
    --callback-url)
      SMOKE_CALLBACK_URL="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="${2:-}"
      OUTPUT_FILE_WAS_SET=1
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
NODE_BIN="$(resolve_node)"

[[ -n "$STORAGE_ACCOUNT_NAME" ]] || die "Missing --storage-account or AZURE_STORAGE_ACCOUNT_NAME"

cd "$REPO_ROOT"

rm -rf "$SEED_DIR"
mkdir -p "$(dirname "$OUTPUT_FILE")"

PAYLOAD_FILE_FOR_NODE="$(az_file_path "$REPO_ROOT/$PAYLOAD_FILE")"
SMOKE_PAYLOAD_FILE_FOR_NODE="$(az_file_path "$REPO_ROOT/$SMOKE_PAYLOAD_FILE")"
SEED_DIR_FOR_NODE="$(az_file_path "$REPO_ROOT/$SEED_DIR")"
npm --workspace @raincloud/worker run seed:pdf-merge -- "$PAYLOAD_FILE_FOR_NODE" "$SEED_DIR_FOR_NODE"

"$NODE_BIN" -e '
const fs = require("node:fs");
const path = require("node:path");
const [inputPath, outputPath, callbackUrl] = process.argv.slice(1);
const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
payload.callback = {
  ...payload.callback,
  url: callbackUrl,
  secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
' "$PAYLOAD_FILE_FOR_NODE" "$SMOKE_PAYLOAD_FILE_FOR_NODE" "$SMOKE_CALLBACK_URL"

OUTPUT_BLOB_NAME="$("$NODE_BIN" -e '
const fs = require("node:fs");
const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const prefix = `${payload.artifactDestination?.prefix ?? ""}`
  .replaceAll("\\", "/")
  .replace(/^\/+/, "")
  .replace(/\/?$/, "/");
const artifactName = `${payload.approvedPlan?.expectedArtifacts?.[0]?.name ?? "merged.pdf"}`
  .trim()
  .replaceAll("\\", "-")
  .replaceAll("/", "-");

if (!prefix || prefix.includes("..") || !artifactName) {
  throw new Error("approved payload has an invalid output artifact destination");
}

process.stdout.write(`${prefix}${artifactName}`);
' "$SMOKE_PAYLOAD_FILE_FOR_NODE")"

if [[ "$OUTPUT_FILE_WAS_SET" == "0" ]]; then
  OUTPUT_FILE=".tmp/$(basename "$OUTPUT_BLOB_NAME")"
fi
mkdir -p "$(dirname "$OUTPUT_FILE")"

AZ_SEED_DIR="$(az_file_path "$REPO_ROOT/$SEED_DIR")"
az storage blob upload-batch \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --destination inputs \
  --source "$AZ_SEED_DIR" \
  --auth-mode login \
  --overwrite true \
  --output none

bash "$SCRIPT_DIR/enqueue-worker-run.sh" \
  --storage-account "$STORAGE_ACCOUNT_NAME" \
  --queue-name "$QUEUE_NAME" \
  --payload "$SMOKE_PAYLOAD_FILE" \
  --ttl-seconds 3600 >/dev/null

JOB_IMAGE="$(az containerapp job show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$JOB_NAME" \
  --query properties.template.containers[0].image \
  -o tsv | tr -d '\r')"

[[ -n "$JOB_IMAGE" ]] || die "Container Apps Job is missing a configured image: $JOB_NAME"

EXECUTION_NAME="$(az containerapp job start \
  --resource-group "$RESOURCE_GROUP" \
  --name "$JOB_NAME" \
  --image "$JOB_IMAGE" \
  --env-vars \
    AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT_NAME" \
    AZURE_STORAGE_QUEUE_NAME="$QUEUE_NAME" \
    RAINCLOUD_WORKER_CALLBACK_SECRET="$SMOKE_CALLBACK_SECRET" \
  --query name \
  -o tsv | tr -d '\r')"

echo "Started job execution: $EXECUTION_NAME"

for _ in $(seq 1 60); do
  STATUS="$(az containerapp job execution show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$JOB_NAME" \
    --job-execution-name "$EXECUTION_NAME" \
    --query properties.status \
    -o tsv 2>/dev/null | tr -d '\r' || true)"

  echo "Execution status: ${STATUS:-unknown}"

  case "$STATUS" in
    Succeeded|Completed)
      break
      ;;
    Failed)
      die "Container Apps Job execution failed: $EXECUTION_NAME"
      ;;
  esac

  sleep 5
done

LATEST_STATUS="$(az containerapp job execution list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$JOB_NAME" \
  --query "[?name=='$EXECUTION_NAME'] | [0].properties.status" \
  -o tsv | tr -d '\r')"

[[ "$LATEST_STATUS" == "Succeeded" || "$LATEST_STATUS" == "Completed" ]] || die "Container Apps Job did not finish successfully: ${LATEST_STATUS:-unknown}"

AZ_OUTPUT_FILE="$(az_file_path "$REPO_ROOT/$OUTPUT_FILE")"
az storage blob download \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$OUTPUT_CONTAINER" \
  --name "$OUTPUT_BLOB_NAME" \
  --file "$AZ_OUTPUT_FILE" \
  --auth-mode login \
  --overwrite true \
  --output none

"$NODE_BIN" -e '
const fs = require("node:fs");
const { PDFDocument } = require("pdf-lib");
const file = process.argv[1];
(async () => {
  const doc = await PDFDocument.load(fs.readFileSync(file));
  console.log(`Downloaded merged PDF: ${file}`);
  console.log(`Page count: ${doc.getPageCount()}`);
})();
' "$OUTPUT_FILE"
