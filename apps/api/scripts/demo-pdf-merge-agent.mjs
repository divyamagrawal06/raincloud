#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

import {
  createApprovedPdfMergeWorkerPayload,
  createPdfMergePlan,
} from "../src/pdfMergePlanner.mjs";
import { enqueueApprovedWorkerRun } from "../src/dispatch.mjs";

const DEFAULT_FIXTURE = "fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json";
const DEFAULT_PROMPT =
  "Merge these seven PDFs. Put Q3 Report before Q2 Report and keep the cover first.";
const DEFAULT_PAYLOAD_OUTPUT = ".tmp/llm-pdf-merge-payload.approved.json";

const parseArgs = (argv) => {
  const options = {
    fixture: DEFAULT_FIXTURE,
    prompt: DEFAULT_PROMPT,
    payloadOutput: DEFAULT_PAYLOAD_OUTPUT,
    approve: false,
    enqueue: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--fixture":
        options.fixture = argv[++index];
        break;
      case "--prompt":
        options.prompt = argv[++index];
        break;
      case "--task-id":
        options.taskId = argv[++index];
        break;
      case "--model":
        options.model = argv[++index];
        break;
      case "--approve":
        options.approve = true;
        break;
      case "--enqueue":
        options.approve = true;
        options.enqueue = true;
        break;
      case "--payload-output":
        options.payloadOutput = argv[++index];
        break;
      case "--callback-url":
        options.callbackUrl = argv[++index];
        break;
      case "--callback-secret-ref":
        options.callbackSecretRef = argv[++index];
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
};

const usage = () => {
  console.log(`Raincloud PDF merge LLM demo

Usage:
  node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs [options]

Options:
  --prompt <text>              User request to plan. Defaults to a Q3-before-Q2 merge.
  --model <model>              Override RAINCLOUD_OPENAI_MODEL.
  --approve                    Write an approved worker payload after plan review.
  --enqueue                    Write and enqueue the approved payload into Azure Storage Queue.
  --payload-output <path>      Output payload path. Default: ${DEFAULT_PAYLOAD_OUTPUT}
  --callback-url <url>         Worker event callback URL for approved payloads.
  --callback-secret-ref <key>  Env-var key resolved inside the worker container.
`);
};

const readFixtureAttachments = (fixturePath) => {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  return {
    taskId: fixture.taskId,
    inputs: fixture.inputs.map((input, index) => ({
      id: input.attachmentId,
      kind: input.kind,
      displayName: input.displayName,
      originalName: input.displayName,
      mimeType: input.mimeType,
      sizeBytes: 0,
      blobKey: input.blobKey,
      uploadedOrder: index,
    })),
  };
};

const printPlan = (planningResult) => {
  console.log(`status: ${planningResult.status}`);
  console.log(`model: ${planningResult.model}`);
  console.log(`summary: ${planningResult.summary}`);

  if (planningResult.status === "needs_input") {
    console.log("clarifying questions:");
    for (const question of planningResult.clarifyingQuestions) {
      console.log(`- ${question.prompt}`);
    }
    return;
  }

  console.log("approved-order-preview:");
  for (const [index, attachment] of planningResult.orderedAttachments.entries()) {
    console.log(`${index + 1}. ${attachment.displayName}`);
  }
  console.log(`artifact: ${planningResult.plan.expectedArtifacts[0].name}`);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    return;
  }

  const fixturePath = resolve(options.fixture);
  const { taskId, inputs } = readFixtureAttachments(fixturePath);
  const planningResult = await createPdfMergePlan({
    taskId: options.taskId ?? taskId,
    prompt: options.prompt,
    attachments: inputs,
    model: options.model ?? process.env.RAINCLOUD_OPENAI_MODEL,
  });

  printPlan(planningResult);

  if (planningResult.status !== "plan_review" || !options.approve) {
    return;
  }

  const runId = `run_${planningResult.plan.id.replace(/^plan_/, "")}`;
  const callbackUrl =
    options.callbackUrl ??
    `${process.env.RAINCLOUD_API_URL ?? "http://localhost:3000"}/internal/worker-runs/${runId}/events`;
  const payload = createApprovedPdfMergeWorkerPayload({
    planningResult,
    runId,
    callbackUrl,
    callbackSecretRef:
      options.callbackSecretRef ?? "RAINCLOUD_WORKER_CALLBACK_SECRET",
    artifactContainer: process.env.AZURE_OUTPUTS_CONTAINER_NAME ?? "outputs",
    artifactPrefix: `outputs/${planningResult.taskId}/${runId}/`,
  });
  const outputPath = resolve(options.payloadOutput);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`payload: ${outputPath}`);

  if (options.enqueue) {
    const enqueueResult = await enqueueApprovedWorkerRun({ payload });
    console.log(`queued: ${enqueueResult.messageId}`);
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
