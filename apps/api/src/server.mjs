import http from "node:http";

import {
  createApprovedPdfMergeWorkerPayload,
  createPdfMergePlan,
} from "./pdfMergePlanner.mjs";
import { enqueueApprovedWorkerRun } from "./dispatch.mjs";

const DEFAULT_PORT = 3000;

const readRequestJson = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body, null, 2));
};

const handlePlanRequest = async (request, response) => {
  const body = await readRequestJson(request);
  const result = await createPdfMergePlan({
    taskId: body.taskId,
    prompt: body.prompt,
    attachments: body.attachments,
    answers: body.answers,
  });

  sendJson(response, 200, result);
};

const handleApproveRequest = async (request, response) => {
  const body = await readRequestJson(request);
  const payload =
    body.payload ??
    createApprovedPdfMergeWorkerPayload({
      planningResult: body.planningResult,
      runId: body.runId,
      callbackUrl: body.callbackUrl,
      callbackSecretRef:
        body.callbackSecretRef ?? "RAINCLOUD_WORKER_CALLBACK_SECRET",
      artifactContainer: body.artifactContainer ?? "outputs",
      artifactPrefix: body.artifactPrefix,
    });
  const enqueueResult = await enqueueApprovedWorkerRun({ payload });

  sendJson(response, 202, {
    status: "queued",
    runId: payload.runId,
    taskId: payload.taskId,
    messageId: enqueueResult.messageId,
  });
};

export const createServer = () =>
  http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      if (request.method === "POST" && request.url === "/v1/pdf-merge/plans") {
        await handlePlanRequest(request, response);
        return;
      }

      if (request.method === "POST" && request.url === "/v1/pdf-merge/approve") {
        await handleApproveRequest(request, response);
        return;
      }

      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

export const startServer = ({ port = Number(process.env.RAINCLOUD_API_PORT) || DEFAULT_PORT } = {}) => {
  const server = createServer();
  server.listen(port, () => {
    console.log(`Raincloud API listening on http://localhost:${port}`);
  });

  return server;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
