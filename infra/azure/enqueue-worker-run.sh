#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_PAYLOAD_FILE="$SCRIPT_DIR/../../fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json"

STORAGE_ACCOUNT_NAME="${AZURE_STORAGE_ACCOUNT_NAME:-}"
QUEUE_NAME="${AZURE_STORAGE_QUEUE_NAME:-approved-worker-runs}"
PAYLOAD_FILE="$DEFAULT_PAYLOAD_FILE"
TIME_TO_LIVE_SECONDS=604800

usage() {
  cat <<'USAGE'
Enqueue an approved Hermes worker run payload into Azure Storage Queue.

Authentication:
  Uses the active Azure CLI session from `az login`. The queue message carries
  callback.secretRef, not the callback secret value.

Options:
  --storage-account <name>  Azure Storage account that owns the queue. Required unless AZURE_STORAGE_ACCOUNT_NAME is set.
  --queue-name <name>       Queue name. Default: approved-worker-runs
  --payload <path>          Approved WorkerRunPayload JSON file. Default: fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json
  --ttl-seconds <seconds>   Queue message TTL. Default: 604800
  -h, --help                Show this help

Example:
  bash infra/azure/enqueue-worker-run.sh --storage-account raincloudabc123mvp
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
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
    --storage-account)
      STORAGE_ACCOUNT_NAME="${2:-}"
      shift 2
      ;;
    --queue-name)
      QUEUE_NAME="${2:-}"
      shift 2
      ;;
    --payload)
      PAYLOAD_FILE="${2:-}"
      shift 2
      ;;
    --ttl-seconds)
      TIME_TO_LIVE_SECONDS="${2:-}"
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
NODE_BIN="$(resolve_node)"

if ! az account show >/dev/null 2>&1; then
  die "Azure CLI is not logged in. Run: az login"
fi

[[ -n "$STORAGE_ACCOUNT_NAME" ]] || die "Missing --storage-account or AZURE_STORAGE_ACCOUNT_NAME"
[[ -f "$PAYLOAD_FILE" ]] || die "Payload file not found: $PAYLOAD_FILE"
[[ "$TIME_TO_LIVE_SECONDS" =~ ^[0-9]+$ ]] || die "--ttl-seconds must be a positive integer"

MESSAGE_CONTENT="$("$NODE_BIN" -e '
const fs = require("node:fs");
const payloadPath = process.argv[1];
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

if (!payload.runId || !payload.taskId || !payload.approvedPlanId) {
  throw new Error("payload must include runId, taskId, and approvedPlanId");
}

if (!payload.approvedPlan || payload.approvedPlan.status !== "approved") {
  throw new Error("payload.approvedPlan.status must be approved");
}

if (!payload.callback || typeof payload.callback.secretRef !== "string" || !payload.callback.secretRef) {
  throw new Error("payload.callback.secretRef must be a non-empty string (env-var name, not the secret value)");
}

if (Object.prototype.hasOwnProperty.call(payload.callback, "secret")) {
  throw new Error("payload.callback must not include a raw secret");
}

process.stdout.write(JSON.stringify(payload));
' "$PAYLOAD_FILE")"

MESSAGE_BYTES="$(printf '%s' "$MESSAGE_CONTENT" | wc -c | tr -d ' ')"

# Azure stores messages base64-encoded; enforce the limit on the encoded size (~49152 raw bytes).
MAX_RAW_BYTES=$(( 65536 * 3 / 4 ))
if (( MESSAGE_BYTES > MAX_RAW_BYTES )); then
  die "Queue message is $MESSAGE_BYTES bytes; base64-encoded it would exceed Azure's 65536-byte limit (max raw: $MAX_RAW_BYTES bytes)"
fi

az storage message put \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --queue-name "$QUEUE_NAME" \
  --content "$MESSAGE_CONTENT" \
  --time-to-live "$TIME_TO_LIVE_SECONDS" \
  --auth-mode login \
  --output json
