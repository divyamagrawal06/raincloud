# Azure CLI MVP Handoff

This is the first cloud implementation slice for Hermes orchestration. It provisions the Azure Storage handoff, builds a small Hermes worker image, deploys it as a manual Azure Container Apps Job, and runs the seven-PDF merge smoke task end to end.

## Prerequisites

Install the Azure CLI, then authenticate locally:

```sh
az login
az account set --subscription <subscription-id>
```

The scripts use that CLI session. They do not require `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, or tenant secret values.

## Deploy The MVP Worker

Run:

```sh
bash infra/azure/deploy-worker-job.sh \
  --resource-group rg-raincloud-mvp \
  --location eastus
```

The deploy script creates or updates:

- One Azure Storage account.
- Blob containers named `inputs` and `outputs`.
- A Storage Queue named `approved-worker-runs`.
- A Basic Azure Container Registry.
- A Container Apps environment with Log Analytics disabled.
- A manual Container Apps Job named `hermes-worker-job`.
- A `$20` monthly Azure Consumption budget alert filtered to the MVP resource group.

It grants the signed-in Azure CLI user Blob/Queue data roles for smoke uploads, and grants the worker job system identity ACR pull plus Blob/Queue data roles.

## Run The End-To-End PDF Merge Smoke

After deployment:

```sh
bash infra/azure/run-pdf-merge-smoke.sh \
  --resource-group rg-raincloud-mvp \
  --storage-account <storage-account-name-printed-by-deploy> \
  --job-name hermes-worker-job
```

The smoke script:

- Generates seven small PDF inputs locally.
- Uploads them to the `inputs` container.
- Enqueues `fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json`.
- Starts the manual Container Apps Job.
- Downloads `.tmp/merged-q1-q3-q2-q4-packet.pdf`.

The sample payload is the first acceptance task: merge seven PDFs, with the clarified natural-language order placing `Q3 Report.pdf` before `Q2 Report.pdf`.

## Secret Boundary

The queue message contains `callback.secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET"`. That value is an environment variable key for the future worker container to resolve locally.

The raw secret must never appear in the queue message. `infra/azure/enqueue-worker-run.sh` rejects payloads that include `callback.secret`, and it does not read or serialize the local value of `RAINCLOUD_WORKER_CALLBACK_SECRET`.

## Current Limit

This path is end-to-end for the seven-PDF smoke task, but it is not yet the product loop. The current worker is manually started, processes one queue message, uploads one artifact, and exits. The API callback receiver, mobile upload flow, clarifying-question planner, durable run store, and automatic queue-triggered scaling still come next.
