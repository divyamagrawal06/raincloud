import { randomUUID } from "node:crypto";

import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueClient } from "@azure/storage-queue";

import {
  parseQueueMessageText,
  resolveBlobKey,
  resolveOutputBlobName,
  validateWorkerPayload,
} from "./payload.mjs";
import { mergePdfBuffers } from "./pdfMerge.mjs";

const DEFAULT_MAX_INVALID_DEQUEUE_COUNT = 3;

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const downloadToBuffer = async (blobClient) => {
  if (typeof blobClient.downloadToBuffer === "function") {
    return blobClient.downloadToBuffer();
  }

  const response = await blobClient.download();
  const chunks = [];

  for await (const chunk of response.readableStreamBody) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const buildArtifact = ({ payload, outputBlobName, sizeBytes, createdAt }) => {
  const artifactName =
    payload.approvedPlan?.expectedArtifacts?.[0]?.name ??
    outputBlobName.split("/").at(-1) ??
    "merged.pdf";

  return {
    id: `artifact_${payload.runId}_merged_pdf`,
    taskId: payload.taskId,
    kind: "pdf",
    name: artifactName,
    description: payload.approvedPlan?.expectedArtifacts?.[0]?.description,
    mimeType: "application/pdf",
    sizeBytes,
    url: `azure-blob://${payload.artifactDestination.container}/${outputBlobName}`,
    createdAt,
  };
};

const buildWorkerEventBase = ({ payload, kind, createEventId, occurredAt }) => ({
  id: createEventId(),
  runId: payload.runId,
  taskId: payload.taskId,
  kind,
  occurredAt,
});

const postWorkerCallback = async ({ payload, event, env, fetchImpl }) => {
  const secretRef = payload.callback?.secretRef;
  const callbackUrl = payload.callback?.url;

  if (!callbackUrl || !secretRef) {
    throw new Error("Worker payload is missing callback url or secretRef");
  }

  const callbackSecret = env[secretRef];

  if (!callbackSecret) {
    throw new Error(`Missing required callback secret environment variable: ${secretRef}`);
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Worker callback fetch implementation is unavailable");
  }

  const response = await fetchImpl(callbackUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${callbackSecret}`,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(
      `Worker callback ${event.kind} failed with ${response.status} ${response.statusText ?? ""}`.trim(),
    );
  }
};

export const processOneQueueMessage = async ({
  storageAccountName,
  queueName,
  credential,
  queueClient: providedQueueClient,
  blobServiceClient: providedBlobServiceClient,
  maxInvalidDequeueCount = DEFAULT_MAX_INVALID_DEQUEUE_COUNT,
  env = process.env,
  fetchImpl = globalThis.fetch,
  createEventId = randomUUID,
  now = () => new Date(),
  logger = console,
}) => {
  const queueClient =
    providedQueueClient ??
    new QueueClient(
      `https://${storageAccountName}.queue.core.windows.net/${queueName}`,
      credential,
    );
  const blobServiceClient =
    providedBlobServiceClient ??
    new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`,
      credential,
    );

  const messages = await queueClient.receiveMessages({
    numberOfMessages: 1,
    visibilityTimeout: 300,
  });
  const message = messages.receivedMessageItems[0];

  if (!message) {
    logger.log("No approved worker run messages are available.");
    return { status: "empty" };
  }

  let payload;

  try {
    payload = validateWorkerPayload(parseQueueMessageText(message.messageText));
  } catch (error) {
    const dequeueCount = Number(message.dequeueCount ?? 1);
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error?.(
      `Invalid worker queue message ${message.messageId}: ${errorMessage}`,
    );

    if (dequeueCount >= maxInvalidDequeueCount) {
      await queueClient.deleteMessage(message.messageId, message.popReceipt);
      logger.warn?.(
        `Deleted invalid worker queue message ${message.messageId} after ${dequeueCount} attempts.`,
      );

      return {
        status: "invalid_discarded",
        messageId: message.messageId,
        dequeueCount,
        error: errorMessage,
      };
    }

    throw error;
  }

  logger.log(`Processing ${payload.runId} for ${payload.taskId}`);

  let artifact;
  let uploadedArtifact;
  let artifactOccurredAt;

  try {
    const inputBuffers = [];

    for (const input of payload.inputs) {
      const { container, blobName } = resolveBlobKey(input.blobKey);
      const blobClient = blobServiceClient
        .getContainerClient(container)
        .getBlobClient(blobName);

      logger.log(`Downloading ${input.displayName} from ${container}/${blobName}`);
      inputBuffers.push(await downloadToBuffer(blobClient));
    }

    const mergedPdf = await mergePdfBuffers(inputBuffers);
    const outputBlobName = resolveOutputBlobName(payload);
    const outputBlockBlobClient = blobServiceClient
      .getContainerClient(payload.artifactDestination.container)
      .getBlockBlobClient(outputBlobName);

    await outputBlockBlobClient.uploadData(mergedPdf, {
      blobHTTPHeaders: {
        blobContentType: "application/pdf",
      },
    });

    artifact = {
      runId: payload.runId,
      taskId: payload.taskId,
      container: payload.artifactDestination.container,
      blobName: outputBlobName,
      sizeBytes: mergedPdf.byteLength,
    };

    artifactOccurredAt = now().toISOString();
    uploadedArtifact = buildArtifact({
      payload,
      outputBlobName,
      sizeBytes: mergedPdf.byteLength,
      createdAt: artifactOccurredAt,
    });
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error);

    await postWorkerCallback({
      payload,
      env,
      fetchImpl,
      event: {
        ...buildWorkerEventBase({
          payload,
          kind: "run_failed",
          createEventId,
          occurredAt: now().toISOString(),
        }),
        failureReason,
      },
    });

    await queueClient.deleteMessage(message.messageId, message.popReceipt);
    logger.error?.(
      JSON.stringify({
        status: "failed",
        runId: payload.runId,
        taskId: payload.taskId,
        failureReason,
      }),
    );

    return {
      status: "failed",
      runId: payload.runId,
      taskId: payload.taskId,
      error: failureReason,
    };
  }

  await postWorkerCallback({
    payload,
    env,
    fetchImpl,
    event: {
      ...buildWorkerEventBase({
        payload,
        kind: "artifact_uploaded",
        createEventId,
        occurredAt: artifactOccurredAt,
      }),
      artifact: uploadedArtifact,
    },
  });

  await postWorkerCallback({
    payload,
    env,
    fetchImpl,
    event: {
      ...buildWorkerEventBase({
        payload,
        kind: "run_succeeded",
        createEventId,
        occurredAt: now().toISOString(),
      }),
      summary: `Merged ${payload.inputs.length} PDF file${payload.inputs.length === 1 ? "" : "s"}.`,
      artifactIds: [uploadedArtifact.id],
    },
  });

  await queueClient.deleteMessage(message.messageId, message.popReceipt);

  logger.log(`Uploaded merged PDF to ${artifact.container}/${artifact.blobName}`);
  logger.log(JSON.stringify({ status: "succeeded", artifact }));

  return { status: "succeeded", artifact };
};

export const main = async () => {
  const storageAccountName = requireEnv("AZURE_STORAGE_ACCOUNT_NAME");
  const queueName = process.env.AZURE_STORAGE_QUEUE_NAME ?? "approved-worker-runs";

  await processOneQueueMessage({
    storageAccountName,
    queueName,
    credential: new DefaultAzureCredential(),
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
