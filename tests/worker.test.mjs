import { test } from "node:test";
import assert from "node:assert/strict";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  parseQueueMessageText,
  resolveBlobKey,
  resolveOutputBlobName,
  validateWorkerPayload,
} from "../apps/worker/src/payload.mjs";
import { mergePdfBuffers } from "../apps/worker/src/pdfMerge.mjs";
import { processOneQueueMessage } from "../apps/worker/src/worker.mjs";

const approvedPayload = {
  runId: "run_test",
  taskId: "task_test",
  approvedPlanId: "plan_test",
  approvedPlan: {
    id: "plan_test",
    taskId: "task_test",
    status: "approved",
    lane: "pdf_merge",
    expectedArtifacts: [
      {
        kind: "pdf",
        name: "merged-test.pdf",
        description: "Merged smoke artifact",
      },
    ],
  },
  inputs: [
    {
      attachmentId: "att_1",
      kind: "pdf",
      blobKey: "inputs/task_test/one.pdf",
      displayName: "One.pdf",
      mimeType: "application/pdf",
    },
  ],
  artifactDestination: {
    container: "outputs",
    prefix: "outputs/task_test/run_test/",
  },
  callback: {
    url: "https://api.example.test/internal/worker-runs/run_test/events",
    secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
  },
};

const createPdf = async (label) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 160]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText(label, {
    x: 32,
    y: 92,
    size: 24,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  return Buffer.from(await doc.save());
};

const createQueueClient = (message, deletedMessages = []) => ({
  receiveMessages: async () => ({
    receivedMessageItems: message ? [message] : [],
  }),
  deleteMessage: async (messageId, popReceipt) => {
    deletedMessages.push({ messageId, popReceipt });
  },
});

const createBlobServiceClient = ({ inputs, uploadedBlobs = [] }) => ({
  getContainerClient: (container) => ({
    getBlobClient: (blobName) => ({
      downloadToBuffer: async () => {
        const key = `${container}/${blobName}`;

        if (!inputs.has(key)) {
          throw new Error(`Missing input blob: ${key}`);
        }

        return inputs.get(key);
      },
    }),
    getBlockBlobClient: (blobName) => ({
      uploadData: async (buffer, options) => {
        uploadedBlobs.push({ container, blobName, buffer, options });
      },
    }),
  }),
});

test("worker parses plain and base64 queue message payloads", () => {
  const plain = JSON.stringify(approvedPayload);
  const base64 = Buffer.from(plain, "utf8").toString("base64");

  assert.deepEqual(parseQueueMessageText(plain), approvedPayload);
  assert.deepEqual(parseQueueMessageText(base64), approvedPayload);
});

test("worker validates approved PDF merge payloads", () => {
  assert.doesNotThrow(() => validateWorkerPayload(approvedPayload));

  assert.throws(
    () =>
      validateWorkerPayload({
        ...approvedPayload,
        callback: {
          ...approvedPayload.callback,
          secret: "raw-secret-value",
        },
      }),
    /raw callback secret/i,
  );

  assert.throws(
    () =>
      validateWorkerPayload({
        ...approvedPayload,
        approvedPlan: {
          ...approvedPayload.approvedPlan,
          status: "proposed",
        },
      }),
    /approved/i,
  );

  assert.throws(
    () =>
      validateWorkerPayload({
        ...approvedPayload,
        callback: {
          url: approvedPayload.callback.url,
        },
      }),
    /callback/i,
  );
});

test("worker resolves scoped blob keys and deterministic output paths", () => {
  assert.deepEqual(resolveBlobKey("inputs/task_test/one.pdf"), {
    container: "inputs",
    blobName: "task_test/one.pdf",
  });

  assert.equal(
    resolveOutputBlobName(approvedPayload),
    "outputs/task_test/run_test/merged-test.pdf",
  );

  assert.throws(() => resolveBlobKey("../secret.pdf"), /invalid blob key/i);
});

test("worker merges PDF buffers in the approved order", async () => {
  const merged = await mergePdfBuffers([
    await createPdf("First"),
    await createPdf("Second"),
    await createPdf("Third"),
  ]);
  const mergedDoc = await PDFDocument.load(merged);

  assert.equal(mergedDoc.getPageCount(), 3);
  assert.ok(Buffer.isBuffer(merged));
});

test("worker deletes invalid poison messages after the retry threshold", async () => {
  const deletedMessages = [];
  const queueClient = createQueueClient(
    {
      messageId: "bad-message",
      popReceipt: "receipt",
      messageText: "not-json",
      dequeueCount: 3,
    },
    deletedMessages,
  );

  const result = await processOneQueueMessage({
    storageAccountName: "account",
    queueName: "approved-worker-runs",
    credential: {},
    queueClient,
    blobServiceClient: {},
    maxInvalidDequeueCount: 3,
    logger: { log() {}, warn() {}, error() {} },
  });

  assert.equal(result.status, "invalid_discarded");
  assert.deepEqual(deletedMessages, [
    { messageId: "bad-message", popReceipt: "receipt" },
  ]);
});

test("worker posts artifact and success callbacks before deleting completed messages", async () => {
  const inputPdf = await createPdf("One");
  const deletedMessages = [];
  const uploadedBlobs = [];
  const callbacks = [];
  const queueClient = createQueueClient(
    {
      messageId: "good-message",
      popReceipt: "receipt",
      messageText: JSON.stringify(approvedPayload),
      dequeueCount: 1,
    },
    deletedMessages,
  );
  const blobServiceClient = createBlobServiceClient({
    inputs: new Map([["inputs/task_test/one.pdf", inputPdf]]),
    uploadedBlobs,
  });

  const result = await processOneQueueMessage({
    storageAccountName: "account",
    queueName: "approved-worker-runs",
    credential: {},
    queueClient,
    blobServiceClient,
    env: {
      RAINCLOUD_WORKER_CALLBACK_SECRET: "callback-secret",
    },
    fetchImpl: async (url, init) => {
      callbacks.push({
        url,
        method: init.method,
        headers: init.headers,
        body: JSON.parse(init.body),
      });

      return { ok: true, status: 202, statusText: "Accepted" };
    },
    createEventId: () => `event_${callbacks.length + 1}`,
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    logger: { log() {}, warn() {}, error() {} },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(uploadedBlobs.length, 1);
  assert.deepEqual(
    callbacks.map((callback) => callback.body.kind),
    ["artifact_uploaded", "run_succeeded"],
  );
  assert.equal(callbacks[0].url, approvedPayload.callback.url);
  assert.equal(callbacks[0].method, "POST");
  assert.equal(callbacks[0].headers.authorization, "Bearer callback-secret");
  assert.equal(callbacks[0].headers["content-type"], "application/json");
  assert.equal(callbacks[0].body.artifact.sizeBytes, result.artifact.sizeBytes);
  assert.deepEqual(callbacks[1].body.artifactIds, [
    callbacks[0].body.artifact.id,
  ]);
  assert.deepEqual(deletedMessages, [
    { messageId: "good-message", popReceipt: "receipt" },
  ]);
});

test("worker posts failure callbacks before deleting failed messages", async () => {
  const deletedMessages = [];
  const callbacks = [];
  const queueClient = createQueueClient(
    {
      messageId: "failed-message",
      popReceipt: "receipt",
      messageText: JSON.stringify(approvedPayload),
      dequeueCount: 1,
    },
    deletedMessages,
  );
  const blobServiceClient = createBlobServiceClient({
    inputs: new Map(),
  });

  const result = await processOneQueueMessage({
    storageAccountName: "account",
    queueName: "approved-worker-runs",
    credential: {},
    queueClient,
    blobServiceClient,
    env: {
      RAINCLOUD_WORKER_CALLBACK_SECRET: "callback-secret",
    },
    fetchImpl: async (url, init) => {
      callbacks.push({
        url,
        method: init.method,
        headers: init.headers,
        body: JSON.parse(init.body),
      });

      return { ok: true, status: 202, statusText: "Accepted" };
    },
    createEventId: () => `event_${callbacks.length + 1}`,
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    logger: { log() {}, warn() {}, error() {} },
  });

  assert.equal(result.status, "failed");
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].url, approvedPayload.callback.url);
  assert.equal(callbacks[0].method, "POST");
  assert.equal(callbacks[0].headers.authorization, "Bearer callback-secret");
  assert.equal(callbacks[0].body.kind, "run_failed");
  assert.match(callbacks[0].body.failureReason, /missing input blob/i);
  assert.deepEqual(deletedMessages, [
    { messageId: "failed-message", popReceipt: "receipt" },
  ]);
});
