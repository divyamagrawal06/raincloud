# Raincloud

Raincloud is a mobile-first AI task platform. Describe a job from your phone, review the plan, approve it, and come back to a finished artifact — no laptop required.

The first task lane merges PDFs: pick files from your phone, describe how you want them combined, review the AI-generated plan, approve it, and receive the merged document when the cloud worker finishes.

## How It Works

1. **Attach & describe** — pick up to 7 PDFs and type a merge prompt (e.g. *"quarterly reports in order, Q1 first"*).
2. **Review the plan** — the API calls OpenAI to generate an ordered file list, assumptions, and steps. Reorder or refine before approving.
3. **Approve** — the plan is enqueued as a worker job on Azure Container Apps.
4. **Poll & download** — the app polls every 3 s; when the worker finishes, tap Download to open the merged PDF.

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54) |
| API | Node.js, Azure Blob Storage, Azure Queue Storage |
| Planner | OpenAI |
| Worker | Azure Container Apps Job |

## Prerequisites

- Node 20+
- Azure storage account with `inputs` and `outputs` containers and an `approved-worker-runs` queue
- `hermes-worker-job` Container Apps Job deployed (see `infra/azure/`)
- OpenAI API key
- [ngrok](https://ngrok.com/download) (free tier) — the Azure worker calls back to your local API over this tunnel
- [Expo Go](https://expo.dev/go) on your phone

## Setup

### 1. Install dependencies

```sh
npm install
```

### 2. Get your Azure storage connection string

```sh
az storage account show-connection-string \
  --name <storage-account> \
  --resource-group <resource-group> \
  --query connectionString -o tsv
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in:

```sh
AZURE_STORAGE_ACCOUNT_NAME=<storage-account>
AZURE_STORAGE_CONNECTION_STRING=<from step 2>
AZURE_INPUTS_CONTAINER_NAME=inputs
AZURE_OUTPUTS_CONTAINER_NAME=outputs
AZURE_STORAGE_QUEUE_NAME=approved-worker-runs
OPENAI_API_KEY=<your key>
RAINCLOUD_WORKER_CALLBACK_SECRET=<any secret string>
RAINCLOUD_API_URL=https://xyz.ngrok-free.app   # fill in after step 4
```

### 4. Start ngrok

```sh
ngrok http 3000
```

Copy the `https://xyz.ngrok-free.app` URL into `RAINCLOUD_API_URL` in `.env`.

### 5. Sync the callback secret to the worker

```sh
az containerapp job update \
  --name hermes-worker-job \
  --resource-group <resource-group> \
  --set-env-vars RAINCLOUD_WORKER_CALLBACK_SECRET=<same value as .env>
```

### 6. Start the API

```sh
npm run start:api
```

### 7. Configure the mobile app

Create `apps/mobile/.env.local`:

```sh
# Use your Wi-Fi LAN IP from ipconfig, not localhost
EXPO_PUBLIC_RAINCLOUD_API_URL=http://192.168.x.x:3000
```

### 8. Start Expo

```sh
npx expo start --prefix apps/mobile --host lan
```

Scan the QR code with Expo Go.

## Demo Flow

1. Tap the attach button → pick 1–7 PDFs.
2. Type a merge prompt and tap **Send** → plan review screen appears.
3. Optionally type a reorder instruction and tap **Apply**.
4. Tap **Approve & Run** → task shows `queued`.
5. Trigger the worker:
   ```sh
   az containerapp job start \
     --name hermes-worker-job \
     --resource-group <resource-group>
   ```
6. Watch the task poll to `running` → `succeeded`.
7. Tap **Download** — merged PDF opens in your system viewer.

## Development

```sh
npm test                                         # build + run tests
npm run typecheck                                # type-check all workspaces
npm --workspace @raincloud/mobile run typecheck  # mobile only
```
