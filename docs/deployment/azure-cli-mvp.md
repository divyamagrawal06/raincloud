# Azure CLI MVP Handoff

This is the first cloud implementation slice for Hermes orchestration. It gets an approved worker payload into Azure Storage Queue using the active Azure CLI session, so local development can start without service-principal variables.

## Prerequisites

Install the Azure CLI, then authenticate locally:

```sh
az login
az account set --subscription <subscription-id>
```

The scripts use that CLI session. They do not require `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, or tenant secret values.

## Provision Storage Handoff Resources

Run:

```sh
bash infra/azure/provision-mvp.sh \
  --resource-group rg-raincloud-dev \
  --location eastus
```

The script deploys `infra/azure/main.bicep`, which creates:

- One Azure Storage account.
- Blob containers named `inputs` and `outputs`.
- A Storage Queue named `approved-worker-runs`.

It also attempts to grant the signed-in Azure CLI user `Storage Queue Data Contributor` and `Storage Blob Data Contributor` on the storage account so the smoke enqueue command can use `--auth-mode login`. Azure role assignment propagation can take a few minutes.

## Enqueue The PDF Merge Smoke Payload

Run the command printed by the provision script, or pass the storage account explicitly:

```sh
bash infra/azure/enqueue-worker-run.sh \
  --storage-account <storage-account-name> \
  --queue-name approved-worker-runs \
  --payload fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json
```

The sample payload is the first acceptance task: merge seven PDFs, with the clarified natural-language order placing `Q3 Report.pdf` before `Q2 Report.pdf`.

## Secret Boundary

The queue message contains `callback.secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET"`. That value is an environment variable key for the future worker container to resolve locally.

The raw secret must never appear in the queue message. `infra/azure/enqueue-worker-run.sh` rejects payloads that include `callback.secret`, and it does not read or serialize the local value of `RAINCLOUD_WORKER_CALLBACK_SECRET`.

## Current Limit

This PR proves the cloud handoff into Azure Storage Queue. The worker image, Container Apps Job, blob upload/download execution, and callback receiver come next.
