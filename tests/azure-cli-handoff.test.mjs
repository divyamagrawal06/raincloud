import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readText(path));

test("Azure CLI provision script creates MVP handoff resources with login auth", () => {
  const provisionPath = "infra/azure/provision-mvp.sh";

  assert.equal(existsSync(provisionPath), true);

  const provision = readText(provisionPath);

  assert.match(provision, /^#!\/usr\/bin\/env bash/);
  assert.match(provision, /az account show/);
  assert.match(provision, /az group create/);
  assert.match(provision, /az deployment group create/);
  assert.match(provision, /main\.bicep/);
  assert.match(provision, /Storage Queue Data Contributor/);
  assert.match(provision, /Storage Blob Data Contributor/);
  assert.doesNotMatch(provision, /AZURE_CLIENT_SECRET/);
  assert.doesNotMatch(provision, /az login --service-principal/);
  assert.doesNotMatch(provision, /connection-string/);
  assert.doesNotMatch(provision, /account-key/);
});

test("Azure Bicep template defines queue and blob resources for the handoff", () => {
  const templatePath = "infra/azure/main.bicep";

  assert.equal(existsSync(templatePath), true);

  const template = readText(templatePath);

  assert.match(template, /Microsoft\.Storage\/storageAccounts@/);
  assert.match(template, /allowBlobPublicAccess: false/);
  assert.match(template, /minimumTlsVersion: 'TLS1_2'/);
  assert.match(template, /Microsoft\.Storage\/storageAccounts\/blobServices\/containers@/);
  assert.match(template, /Microsoft\.Storage\/storageAccounts\/queueServices\/queues@/);
  assert.match(template, /output storageAccountName string/);
  assert.match(template, /output queueName string/);
});

test("Azure CLI enqueue script sends approved worker payload without raw secrets", () => {
  const enqueuePath = "infra/azure/enqueue-worker-run.sh";

  assert.equal(existsSync(enqueuePath), true);

  const enqueue = readText(enqueuePath);

  assert.match(enqueue, /^#!\/usr\/bin\/env bash/);
  assert.match(enqueue, /az account show/);
  assert.match(enqueue, /az storage message put/);
  assert.match(enqueue, /--auth-mode login/);
  assert.match(enqueue, /callback\.secretRef/);
  assert.match(enqueue, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.doesNotMatch(enqueue, /AZURE_CLIENT_SECRET/);
  assert.doesNotMatch(enqueue, /connection-string/);
  assert.doesNotMatch(enqueue, /account-key/);
});

test("sample PDF merge worker payload captures the first cloud smoke task", () => {
  const payloadPath = "fixtures/worker-runs/pdf-merge-seven-pdfs.approved.json";

  assert.equal(existsSync(payloadPath), true);

  const payload = readJson(payloadPath);

  assert.equal(payload.runId, "run_pdf_merge_smoke_001");
  assert.equal(payload.taskId, "task_pdf_merge_smoke_001");
  assert.equal(payload.approvedPlanId, payload.approvedPlan.id);
  assert.equal(payload.approvedPlan.status, "approved");
  assert.equal(payload.approvedPlan.lane, "pdf_merge");
  assert.equal(payload.inputs.length, 7);
  assert.deepEqual(
    payload.inputs.map((input) => input.displayName),
    [
      "Cover.pdf",
      "Q1 Report.pdf",
      "Q3 Report.pdf",
      "Q2 Report.pdf",
      "Q4 Report.pdf",
      "Appendix A.pdf",
      "Appendix B.pdf",
    ],
  );
  assert.equal(payload.artifactDestination.container, "outputs");
  assert.match(payload.artifactDestination.prefix, /^outputs\/task_pdf_merge_smoke_001\/run_pdf_merge_smoke_001\//);
  assert.equal(payload.callback.secretRef, "RAINCLOUD_WORKER_CALLBACK_SECRET");
  assert.equal(Object.hasOwn(payload.callback, "secret"), false);
});

test("Azure CLI MVP deployment docs explain local CLI auth and the smoke path", () => {
  const docPath = "docs/deployment/azure-cli-mvp.md";

  assert.equal(existsSync(docPath), true);

  const doc = readText(docPath);

  assert.match(doc, /az login/);
  assert.match(doc, /infra\/azure\/provision-mvp\.sh/);
  assert.match(doc, /infra\/azure\/enqueue-worker-run\.sh/);
  assert.match(doc, /fixtures\/worker-runs\/pdf-merge-seven-pdfs\.approved\.json/);
  assert.match(doc, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.match(doc, /raw secret/i);
});
