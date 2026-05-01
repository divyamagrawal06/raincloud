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
  assert.match(provision, /wslpath -w/);
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
  assert.match(enqueue, /env-var name, not the secret value/);
  assert.doesNotMatch(enqueue, /AZURE_CLIENT_SECRET/);
  assert.doesNotMatch(enqueue, /connection-string/);
  assert.doesNotMatch(enqueue, /account-key/);
});

test("Azure worker deployment script builds a cost-bounded manual Container Apps Job", () => {
  const deployPath = "infra/azure/deploy-worker-job.sh";

  assert.equal(existsSync(deployPath), true);

  const deploy = readText(deployPath);

  assert.match(deploy, /^#!\/usr\/bin\/env bash/);
  assert.match(deploy, /az provider register/);
  assert.match(deploy, /az acr create/);
  assert.match(deploy, /--sku Basic/);
  assert.match(deploy, /az acr build/);
  assert.match(deploy, /wslpath -w/);
  assert.match(deploy, /tr -d '\\r'/);
  assert.match(deploy, /az rest/);
  assert.match(deploy, /END_DATE=/);
  assert.match(deploy, /\+1 year/);
  assert.match(deploy, /date -u -v\+1y/);
  assert.match(deploy, /"endDate": "\$END_DATE"/);
  assert.doesNotMatch(deploy, /2026-12-31/);
  assert.match(deploy, /actual_GreaterThan_80_Percent/);
  assert.match(deploy, /actual_GreaterThan_100_Percent/);
  assert.match(deploy, /az containerapp env create/);
  assert.match(deploy, /--logs-destination none/);
  assert.match(deploy, /az containerapp job create/);
  assert.match(deploy, /--trigger-type Manual/);
  assert.match(deploy, /--mi-system-assigned/);
  assert.match(deploy, /--registry-identity system/);
  assert.match(deploy, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.match(deploy, /raincloud-worker-callback-secret/);
  assert.match(deploy, /secretref:\$WORKER_CALLBACK_SECRET_NAME/);
  assert.match(deploy, /Storage Queue Data Contributor/);
  assert.match(deploy, /Storage Blob Data Contributor/);
  assert.doesNotMatch(deploy, /AZURE_CLIENT_SECRET/);
  assert.doesNotMatch(deploy, /connection-string/);
  assert.doesNotMatch(deploy, /account-key/);
});

test("Docker build context excludes local dependency and generated output folders", () => {
  const dockerignorePath = ".dockerignore";

  assert.equal(existsSync(dockerignorePath), true);

  const dockerignore = readText(dockerignorePath);

  assert.match(dockerignore, /^node_modules$/m);
  assert.match(dockerignore, /^\*\*\/node_modules$/m);
  assert.match(dockerignore, /^\.tmp$/m);
  assert.match(dockerignore, /^graphify-out$/m);
});

test("Azure smoke script seeds PDFs, enqueues the task, runs the job, and downloads the output", () => {
  const smokePath = "infra/azure/run-pdf-merge-smoke.sh";

  assert.equal(existsSync(smokePath), true);

  const smoke = readText(smokePath);

  assert.match(smoke, /^#!\/usr\/bin\/env bash/);
  assert.match(smoke, /npm --workspace @raincloud\/worker run seed:pdf-merge/);
  assert.match(smoke, /enqueue-worker-run\.sh/);
  assert.match(smoke, /JOB_IMAGE="\$\(az containerapp job show/);
  assert.match(smoke, /az containerapp job start/);
  assert.match(smoke, /--image "\$JOB_IMAGE"/);
  assert.match(smoke, /RAINCLOUD_WORKER_SMOKE_CALLBACK_URL/);
  assert.match(smoke, /https:\/\/httpbingo\.org\/status\/202/);
  assert.match(smoke, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.match(smoke, /--env-vars/);
  assert.match(smoke, /\.tmp\/pdf-merge-smoke-payload\.approved\.json/);
  assert.match(smoke, /az containerapp job execution list/);
  assert.match(smoke, /az storage blob download/);
  assert.match(smoke, /payload\.artifactDestination\?\.prefix/);
  assert.match(smoke, /payload\.approvedPlan\?\.expectedArtifacts\?\.\[0\]\?\.name/);
  assert.match(smoke, /wslpath -w/);
  assert.match(smoke, /--auth-mode login/);
  assert.doesNotMatch(smoke, /connection-string/);
  assert.doesNotMatch(smoke, /account-key/);
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
  assert.match(doc, /infra\/azure\/deploy-worker-job\.sh/);
  assert.match(doc, /infra\/azure\/run-pdf-merge-smoke\.sh/);
  assert.match(doc, /infra\/azure\/enqueue-worker-run\.sh/);
  assert.match(doc, /fixtures\/worker-runs\/pdf-merge-seven-pdfs\.approved\.json/);
  assert.match(doc, /\.tmp\/pdf-merge-smoke-payload\.approved\.json/);
  assert.match(doc, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.match(doc, /RAINCLOUD_WORKER_SMOKE_CALLBACK_URL/);
  assert.match(doc, /raw secret/i);
});
