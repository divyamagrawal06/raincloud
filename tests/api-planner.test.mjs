import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createApprovedPdfMergeWorkerPayload,
  createPdfMergePlan,
} from "../apps/api/src/pdfMergePlanner.mjs";
import { enqueueApprovedWorkerRun } from "../apps/api/src/dispatch.mjs";

const attachments = [
  {
    id: "att_cover",
    kind: "pdf",
    displayName: "Cover.pdf",
    originalName: "cover.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    blobKey: "inputs/task_demo/cover.pdf",
    uploadedOrder: 0,
  },
  {
    id: "att_q1",
    kind: "pdf",
    displayName: "Q1 Report.pdf",
    originalName: "q1-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    blobKey: "inputs/task_demo/q1-report.pdf",
    uploadedOrder: 1,
  },
  {
    id: "att_q2",
    kind: "pdf",
    displayName: "Q2 Report.pdf",
    originalName: "q2-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    blobKey: "inputs/task_demo/q2-report.pdf",
    uploadedOrder: 2,
  },
  {
    id: "att_q3",
    kind: "pdf",
    displayName: "Q3 Report.pdf",
    originalName: "q3-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    blobKey: "inputs/task_demo/q3-report.pdf",
    uploadedOrder: 3,
  },
];

const responseFromPlanner = (plannerJson) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => ({
    id: "resp_test",
    output_text: JSON.stringify(plannerJson),
  }),
});

test("planner asks a clarifying question instead of creating a plan for ambiguous PDF order", async () => {
  const result = await createPdfMergePlan({
    taskId: "task_demo",
    prompt: "Merge these PDFs.",
    attachments,
    openaiApiKey: "test-openai-key",
    model: "gpt-test",
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    fetchImpl: async () =>
      responseFromPlanner({
        status: "needs_input",
        summary: "The merge request is valid, but the ordering is ambiguous.",
        goal: "Merge the attached PDFs into one file.",
        orderedAttachmentIds: [],
        clarifyingQuestions: [
          {
            id: "order",
            kind: "short_text",
            prompt: "What order should I use for the PDF files?",
            options: [],
          },
        ],
        assumptions: [],
        steps: [],
        expectedArtifactName: "merged.pdf",
        risks: [],
      }),
  });

  assert.equal(result.status, "needs_input");
  assert.equal(result.plan, undefined);
  assert.equal(result.clarifyingQuestions.length, 1);
  assert.equal(result.clarifyingQuestions[0].kind, "short_text");
  assert.match(result.clarifyingQuestions[0].prompt, /order/i);
});

test("planner converts a natural-language reorder request into a reviewable PDF merge plan", async () => {
  const fetchCalls = [];
  const result = await createPdfMergePlan({
    taskId: "task_demo",
    prompt: "Merge these PDFs and do Q3 Report before Q2 Report.",
    attachments,
    openaiApiKey: "test-openai-key",
    model: "gpt-test",
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });

      return responseFromPlanner({
        status: "plan_review",
        summary: "Merge the PDFs with Q3 before Q2.",
        goal: "Create one merged PDF in the requested order.",
        orderedAttachmentIds: ["att_cover", "att_q1", "att_q3", "att_q2"],
        clarifyingQuestions: [],
        assumptions: ["The cover stays first because no instruction moved it."],
        steps: [
          "Validate the four PDF attachments.",
          "Merge the PDFs in the approved order.",
          "Return one downloadable PDF artifact.",
        ],
        expectedArtifactName: "merged-q3-before-q2.pdf",
        risks: ["Encrypted or corrupt PDFs may fail to merge."],
      });
    },
  });

  assert.equal(result.status, "plan_review");
  assert.equal(result.model, "gpt-test");
  assert.deepEqual(
    result.orderedAttachments.map((attachment) => attachment.displayName),
    ["Cover.pdf", "Q1 Report.pdf", "Q3 Report.pdf", "Q2 Report.pdf"],
  );
  assert.equal(result.plan.status, "proposed");
  assert.equal(result.plan.lane, "pdf_merge");
  assert.equal(result.plan.expectedArtifacts[0].name, "merged-q3-before-q2.pdf");
  assert.match(fetchCalls[0].url, /\/v1\/responses$/);
  assert.equal(fetchCalls[0].init.headers.authorization, "Bearer test-openai-key");
  assert.doesNotMatch(fetchCalls[0].init.body, /test-openai-key/);
});

test("approved PDF merge plans become worker payloads without raw callback secrets", async () => {
  const planningResult = await createPdfMergePlan({
    taskId: "task_demo",
    prompt: "Merge these PDFs and do Q3 Report before Q2 Report.",
    attachments,
    openaiApiKey: "test-openai-key",
    model: "gpt-test",
    now: () => new Date("2026-05-01T00:00:00.000Z"),
    fetchImpl: async () =>
      responseFromPlanner({
        status: "plan_review",
        summary: "Merge the PDFs with Q3 before Q2.",
        goal: "Create one merged PDF in the requested order.",
        orderedAttachmentIds: ["att_cover", "att_q1", "att_q3", "att_q2"],
        clarifyingQuestions: [],
        assumptions: [],
        steps: ["Merge the PDFs in the approved order."],
        expectedArtifactName: "merged-q3-before-q2.pdf",
        risks: [],
      }),
  });

  const payload = createApprovedPdfMergeWorkerPayload({
    planningResult,
    runId: "run_demo",
    callbackUrl: "https://api.example.test/internal/worker-runs/run_demo/events",
    callbackSecretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
    artifactContainer: "outputs",
    artifactPrefix: "outputs/task_demo/run_demo/",
    now: () => new Date("2026-05-01T00:10:00.000Z"),
  });

  assert.equal(payload.runId, "run_demo");
  assert.equal(payload.approvedPlan.status, "approved");
  assert.equal(payload.approvedPlan.approvedAt, "2026-05-01T00:10:00.000Z");
  assert.deepEqual(
    payload.inputs.map((input) => input.attachmentId),
    ["att_cover", "att_q1", "att_q3", "att_q2"],
  );
  assert.equal(payload.callback.secretRef, "RAINCLOUD_WORKER_CALLBACK_SECRET");
  assert.equal(Object.hasOwn(payload.callback, "secret"), false);
});

test("dispatcher sends exactly the approved worker payload to the queue", async () => {
  const sentMessages = [];
  const payload = {
    runId: "run_demo",
    taskId: "task_demo",
    approvedPlanId: "plan_demo",
    approvedPlan: {
      id: "plan_demo",
      taskId: "task_demo",
      status: "approved",
      lane: "pdf_merge",
      expectedArtifacts: [
        {
          kind: "pdf",
          name: "merged.pdf",
          description: "Merged PDF",
        },
      ],
      approvedAt: "2026-05-01T00:10:00.000Z",
    },
    inputs: [
      {
        attachmentId: "att_cover",
        kind: "pdf",
        blobKey: "inputs/task_demo/cover.pdf",
        displayName: "Cover.pdf",
        mimeType: "application/pdf",
      },
    ],
    artifactDestination: {
      container: "outputs",
      prefix: "outputs/task_demo/run_demo/",
    },
    callback: {
      url: "https://api.example.test/internal/worker-runs/run_demo/events",
      secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
    },
  };

  const result = await enqueueApprovedWorkerRun({
    payload,
    queueClient: {
      sendMessage: async (messageText, options) => {
        sentMessages.push({ messageText, options });
        return { messageId: "queue_message_1" };
      },
    },
  });

  assert.equal(result.messageId, "queue_message_1");
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(JSON.parse(sentMessages[0].messageText), payload);
  assert.equal(sentMessages[0].options.timeToLive, 604800);
  assert.doesNotMatch(sentMessages[0].messageText, /raw-secret/i);
});
