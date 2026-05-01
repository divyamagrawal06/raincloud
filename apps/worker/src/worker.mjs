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

export const processOneQueueMessage = async ({
  storageAccountName,
  queueName,
  credential,
  logger = console,
}) => {
  const queueClient = new QueueClient(
    `https://${storageAccountName}.queue.core.windows.net/${queueName}`,
    credential,
  );
  const blobServiceClient = new BlobServiceClient(
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

  const payload = validateWorkerPayload(parseQueueMessageText(message.messageText));

  logger.log(`Processing ${payload.runId} for ${payload.taskId}`);

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

  await queueClient.deleteMessage(message.messageId, message.popReceipt);

  const artifact = {
    runId: payload.runId,
    taskId: payload.taskId,
    container: payload.artifactDestination.container,
    blobName: outputBlobName,
    sizeBytes: mergedPdf.byteLength,
  };

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
