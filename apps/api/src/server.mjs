import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  createApprovedPdfMergeWorkerPayload,
  createPdfMergePlan,
} from "./pdfMergePlanner.mjs";
import { enqueueApprovedWorkerRun } from "./dispatch.mjs";
import {
  getArtifact,
  getArtifactsForTask,
  getAttachmentsForTask,
  getPlan,
  getRun,
  getRunForTask,
  getTask,
  isEventProcessed,
  markEventProcessed,
  saveArtifact,
  saveAttachment,
  savePlan,
  saveRun,
  saveTask,
  supersedePriorPlans,
  updateRunStatus,
  updateTaskStatus,
} from "./store.mjs";

const DEFAULT_PORT = 3000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    ...CORS_HEADERS,
  });
  response.end(JSON.stringify(body, null, 2));
};

const readRequestJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

// ---- blob client (lazy, cached) ----

let blobServiceClientCache = null;

const getBlobServiceClient = async () => {
  if (blobServiceClientCache) return blobServiceClientCache;
  const { BlobServiceClient } = await import("@azure/storage-blob");
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    blobServiceClientCache = BlobServiceClient.fromConnectionString(connectionString);
  } else {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!storageAccountName) throw new Error("Missing AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING");
    blobServiceClientCache = new BlobServiceClient(
      `https://${storageAccountName}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
  }
  return blobServiceClientCache;
};

// ---- route table ----
// Defined after handler function declarations; hoisting makes this safe.

const routes = [
  { method: "GET",  pattern: /^\/health$/,                                           handler: handleHealth },
  { method: "POST", pattern: /^\/v1\/pdf-merge\/uploads$/,                           handler: handleUploads },
  { method: "POST", pattern: /^\/v1\/pdf-merge\/plans$/,                             handler: handlePlan },
  { method: "POST", pattern: /^\/v1\/pdf-merge\/approve$/,                           handler: handleApprove },
  { method: "POST", pattern: /^\/internal\/worker-runs\/([^/]+)\/events$/,          handler: handleWorkerEvent },
  { method: "GET",  pattern: /^\/v1\/tasks\/([^/]+)$/,                               handler: handleGetTask },
  { method: "GET",  pattern: /^\/v1\/artifacts\/([^/]+)\/download$/,                 handler: handleArtifactDownload },
];

// ---- handlers ----

async function handleHealth(_request, response) {
  sendJson(response, 200, { status: "ok" });
}

async function handleUploads(request, response) {
  const { default: busboy } = await import("busboy");
  const inputsContainer = process.env.AZURE_INPUTS_CONTAINER_NAME ?? "inputs";
  const taskId = randomUUID();

  const attachmentList = [];
  let uploadError = null;

  try {
    const blobServiceClient = await getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(inputsContainer);

    await new Promise((resolve, reject) => {
      const bb = busboy({ headers: request.headers });
      const uploadPromises = [];
      let fileIndex = 0;
      let tooManyFiles = false;

      bb.on("file", (_fieldname, stream, info) => {
        const thisIndex = fileIndex++;

        if (thisIndex >= 7) {
          tooManyFiles = true;
          stream.resume();
          return;
        }

        const { filename, mimeType } = info;

        if (mimeType !== "application/pdf") {
          stream.resume();
          const err = new Error(`File "${filename}" is not a PDF (received ${mimeType})`);
          err.statusCode = 400;
          reject(err);
          return;
        }

        const attachmentId = randomUUID();
        const blobName = `${taskId}/${attachmentId}.pdf`;
        const blobKey = `${inputsContainer}/${blobName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const displayName = filename || `file-${thisIndex + 1}.pdf`;

        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));

        uploadPromises.push(
          new Promise((res, rej) => {
            stream.on("end", async () => {
              try {
                const buffer = Buffer.concat(chunks);
                if (buffer.byteLength > 50 * 1024 * 1024) {
                  const e = new Error(`File "${displayName}" exceeds the 50 MB limit`);
                  e.statusCode = 400;
                  rej(e);
                  return;
                }
                await blockBlobClient.uploadData(buffer, {
                  blobHTTPHeaders: { blobContentType: "application/pdf" },
                });
                attachmentList.push({
                  id: attachmentId,
                  taskId,
                  kind: "pdf",
                  displayName,
                  originalName: displayName,
                  mimeType: "application/pdf",
                  sizeBytes: buffer.byteLength,
                  blobKey,
                  uploadedOrder: thisIndex,
                  createdAt: new Date().toISOString(),
                });
                res();
              } catch (err) {
                rej(err);
              }
            });
            stream.on("error", rej);
          }),
        );
      });

      bb.on("finish", async () => {
        if (tooManyFiles) {
          const e = new Error("Maximum 7 PDF files allowed");
          e.statusCode = 400;
          reject(e);
          return;
        }
        try {
          await Promise.all(uploadPromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      bb.on("error", reject);
      request.pipe(bb);
    });
  } catch (err) {
    uploadError = err;
  }

  if (uploadError) {
    sendJson(response, uploadError.statusCode ?? 500, {
      error: uploadError.message ?? "Upload failed",
    });
    return;
  }

  if (attachmentList.length === 0) {
    sendJson(response, 400, { error: "At least one PDF file is required" });
    return;
  }

  attachmentList.sort((a, b) => a.uploadedOrder - b.uploadedOrder);

  const now = new Date().toISOString();
  saveTask({
    id: taskId,
    ownerId: "local",
    title: `PDF Merge (${attachmentList.length} file${attachmentList.length === 1 ? "" : "s"})`,
    prompt: "",
    status: "draft",
    lane: "pdf_merge",
    artifactIds: [],
    createdAt: now,
    updatedAt: now,
  });

  for (const attachment of attachmentList) {
    saveAttachment(attachment);
  }

  sendJson(response, 200, { taskId, attachments: attachmentList });
}

async function handlePlan(request, response) {
  const body = await readRequestJson(request);
  const { taskId, prompt, answers } = body;

  if (!taskId) {
    sendJson(response, 400, { error: "taskId is required" });
    return;
  }

  const task = getTask(taskId);
  if (!task) {
    sendJson(response, 404, { error: "Task not found" });
    return;
  }

  const storedAttachments = getAttachmentsForTask(taskId);
  if (storedAttachments.length === 0) {
    sendJson(response, 400, { error: "No attachments found for this task" });
    return;
  }

  const result = await createPdfMergePlan({
    taskId,
    prompt,
    attachments: storedAttachments,
    answers,
  });

  if (result.status === "plan_review") {
    savePlan({
      ...result.plan,
      orderedAttachmentIds: result.orderedAttachments.map((a) => a.id),
    });
    supersedePriorPlans(taskId, result.plan.id);
    updateTaskStatus(taskId, "plan_review", { activePlanId: result.plan.id });
  } else if (result.status === "needs_input") {
    updateTaskStatus(taskId, "clarifying");
  }

  sendJson(response, 200, result);
}

async function handleApprove(request, response) {
  const body = await readRequestJson(request);
  const { taskId, planId } = body;

  if (!taskId || !planId) {
    sendJson(response, 400, { error: "taskId and planId are required" });
    return;
  }

  const task = getTask(taskId);
  if (!task) {
    sendJson(response, 404, { error: "Task not found" });
    return;
  }

  const planRecord = getPlan(planId);
  if (!planRecord) {
    sendJson(response, 404, { error: "Plan not found" });
    return;
  }

  if (planRecord.status !== "proposed") {
    sendJson(response, 409, { error: `Plan is already ${planRecord.status}` });
    return;
  }

  const storedAttachments = getAttachmentsForTask(taskId);
  const attachmentById = new Map(storedAttachments.map((a) => [a.id, a]));
  const orderedAttachments = planRecord.orderedAttachmentIds
    .map((id) => attachmentById.get(id))
    .filter(Boolean);

  // Reconstruct planningResult expected by createApprovedPdfMergeWorkerPayload.
  // Strip the API-internal orderedAttachmentIds field before passing to planner util.
  const { orderedAttachmentIds: _internal, ...planWithoutInternal } = planRecord;
  const planningResult = {
    status: "plan_review",
    taskId,
    lane: "pdf_merge",
    plan: planWithoutInternal,
    clarifyingQuestions: [],
    orderedAttachments,
  };

  const runId = randomUUID();
  const apiUrl =
    process.env.RAINCLOUD_API_URL ??
    `http://localhost:${process.env.RAINCLOUD_API_PORT ?? DEFAULT_PORT}`;
  // TUNNEL REQUIRED for local E2E — worker runs in Azure Container Apps and cannot reach localhost.
  // Set RAINCLOUD_API_URL to an ngrok/cloudflared tunnel URL for end-to-end testing.
  const callbackUrl = `${apiUrl}/internal/worker-runs/${runId}/events`;

  const payload = createApprovedPdfMergeWorkerPayload({
    planningResult,
    runId,
    callbackUrl,
    callbackSecretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
    artifactContainer: process.env.AZURE_OUTPUTS_CONTAINER_NAME ?? "outputs",
    artifactPrefix: `outputs/${taskId}/${runId}/`,
  });

  const now = new Date().toISOString();

  await enqueueApprovedWorkerRun({ payload });

  saveRun({
    id: runId,
    taskId,
    planId,
    status: "queued",
    createdAt: now,
  });

  savePlan({
    ...planRecord,
    status: "approved",
    approvedAt: payload.approvedPlan.approvedAt,
  });

  updateTaskStatus(taskId, "queued");

  sendJson(response, 202, { status: "queued", taskId, runId, planId });
}

async function handleWorkerEvent(request, response, [runId]) {
  const authHeader = request.headers.authorization ?? "";
  const expectedSecret = process.env.RAINCLOUD_WORKER_CALLBACK_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  const event = await readRequestJson(request);

  if (event.runId !== runId) {
    sendJson(response, 400, { error: "event.runId does not match URL runId" });
    return;
  }

  if (!event.id) {
    sendJson(response, 400, { error: "event.id is required" });
    return;
  }

  const runRecord = getRun(runId);
  if (!runRecord) {
    sendJson(response, 404, { error: "Run not found" });
    return;
  }
  if (event.taskId !== runRecord.taskId) {
    sendJson(response, 400, { error: "event.taskId does not match run record" });
    return;
  }

  // Idempotency: return 200 so the worker deletes the queue message on retry.
  if (isEventProcessed(runId, event.id)) {
    sendJson(response, 200, { status: "duplicate" });
    return;
  }

  // Claim the event before writing side effects so a crash-on-write produces
  // a harmless duplicate on retry rather than a double-write.
  markEventProcessed(runId, event.id);

  const { taskId, kind } = event;

  if (kind === "artifact_uploaded") {
    saveArtifact(event.artifact);
    const task = getTask(taskId);
    const updatedArtifactIds = [...(task?.artifactIds ?? [])];
    if (!updatedArtifactIds.includes(event.artifact.id)) {
      updatedArtifactIds.push(event.artifact.id);
    }
    updateTaskStatus(taskId, "running", { artifactIds: updatedArtifactIds });
    if (!runRecord.startedAt) {
      updateRunStatus(runId, "running", { startedAt: event.occurredAt });
    }
  } else if (kind === "run_succeeded") {
    updateRunStatus(runId, "succeeded", { finishedAt: event.occurredAt });
    updateTaskStatus(taskId, "succeeded");
  } else if (kind === "run_failed") {
    updateRunStatus(runId, "failed", {
      finishedAt: event.occurredAt,
      failureReason: event.failureReason,
    });
    updateTaskStatus(taskId, "failed");
  }

  sendJson(response, 200, { status: "ok" });
}

async function handleGetTask(_request, response, [taskId]) {
  const task = getTask(taskId);
  if (!task) {
    sendJson(response, 404, { error: "Task not found" });
    return;
  }

  const planRecord = task.activePlanId ? getPlan(task.activePlanId) : null;
  // Strip the API-internal orderedAttachmentIds field before sending to mobile.
  const plan = planRecord
    ? (({ orderedAttachmentIds: _, ...rest }) => rest)(planRecord)
    : null;

  const run = getRunForTask(taskId);
  const artifactList = getArtifactsForTask(taskId);

  sendJson(response, 200, { task, plan, run, artifacts: artifactList });
}

async function handleArtifactDownload(_request, response, [artifactId]) {
  const artifact = getArtifact(artifactId);
  if (!artifact) {
    sendJson(response, 404, { error: "Artifact not found" });
    return;
  }

  if (!artifact.url?.startsWith("azure-blob://")) {
    sendJson(response, 400, { error: "Artifact has no downloadable blob URL" });
    return;
  }

  // Parse azure-blob://${container}/${blobName}
  const withoutScheme = artifact.url.slice("azure-blob://".length);
  const slashIndex = withoutScheme.indexOf("/");
  const container = withoutScheme.slice(0, slashIndex);
  const blobName = withoutScheme.slice(slashIndex + 1);

  const blobServiceClient = await getBlobServiceClient();
  const blobClient = blobServiceClient.getContainerClient(container).getBlobClient(blobName);
  const downloadResponse = await blobClient.download();
  const readableStream = downloadResponse.readableStreamBody;

  if (!readableStream) {
    sendJson(response, 500, { error: "Blob stream unavailable" });
    return;
  }

  const safeName = String(artifact.name ?? "file.pdf").replace(/["\\\r\n]/g, "_");
  const responseHeaders = {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${safeName}"`,
    ...CORS_HEADERS,
  };
  if (downloadResponse.contentLength != null) {
    responseHeaders["content-length"] = String(downloadResponse.contentLength);
  }
  response.writeHead(200, responseHeaders);
  readableStream.pipe(response);
}

// ---- server lifecycle ----

export const createServer = () =>
  http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }

    const url = (request.url ?? "/").split("?")[0];
    console.log(`${request.method} ${url}`);

    for (const { method, pattern, handler } of routes) {
      if (request.method !== method) continue;
      const match = url.match(pattern);
      if (match) {
        try {
          await handler(request, response, match.slice(1));
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }
    }

    sendJson(response, 404, { error: "not_found" });
  });

export const startServer = ({
  port = Number(process.env.RAINCLOUD_API_PORT) || DEFAULT_PORT,
} = {}) => {
  const server = createServer();
  server.listen(port, () => {
    console.log(`Raincloud API listening on http://localhost:${port}`);
  });
  return server;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  startServer();
}
