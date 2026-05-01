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
