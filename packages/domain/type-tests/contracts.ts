import {
  isTerminalTaskStatus,
  isTerminalWorkerEventKind,
  isTerminalWorkerRunStatus,
  type ApprovedPlanSnapshot,
  type Attachment,
  type ClarifyingQuestion,
  type SecretEnvironmentVariableName,
  type TerminalTaskStatus,
  type TerminalWorkerEventKind,
  type TerminalWorkerRunStatus,
  type WorkerEvent,
  type WorkerRunClaimResult,
  type WorkerRunPayload,
  type WorkerRun,
} from "../src/index.js";

const rawTaskStatus: string = "succeeded";

if (isTerminalTaskStatus(rawTaskStatus)) {
  const narrowedStatus: TerminalTaskStatus = rawTaskStatus;
  void narrowedStatus;
}

const rawWorkerRunStatus: string = "failed";

if (isTerminalWorkerRunStatus(rawWorkerRunStatus)) {
  const narrowedStatus: TerminalWorkerRunStatus = rawWorkerRunStatus;
  void narrowedStatus;
}

const rawWorkerEventKind: string = "run_succeeded";

if (isTerminalWorkerEventKind(rawWorkerEventKind)) {
  const narrowedKind: TerminalWorkerEventKind = rawWorkerEventKind;
  void narrowedKind;
}

const queuedWorkerRun: WorkerRun = {
  id: "run_1",
  taskId: "task_1",
  planId: "plan_1",
  status: "queued",
  createdAt: "2026-05-01T00:00:00.000Z",
};

void queuedWorkerRun;

// @ts-expect-error createdAt is required even before a run starts.
const workerRunWithoutCreatedAt: WorkerRun = {
  id: "run_2",
  taskId: "task_1",
  planId: "plan_1",
  status: "queued",
};

void workerRunWithoutCreatedAt;

const pdfAttachment: Attachment = {
  id: "att_1",
  taskId: "task_1",
  kind: "pdf",
  displayName: "Q3 Report.pdf",
  originalName: "q3-report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  blobKey: "inputs/task_1/q3-report.pdf",
  uploadedOrder: 2,
  createdAt: "2026-05-01T00:00:00.000Z",
};

void pdfAttachment;

const approvedPdfMergePlan: ApprovedPlanSnapshot = {
  id: "plan_1",
  taskId: "task_1",
  status: "approved",
  lane: "pdf_merge",
  goal: "Merge the approved PDFs into one returned PDF.",
  assumptions: ["Merge files in approved order."],
  requiredInputs: ["PDF files"],
  requiredPermissions: ["Read uploaded PDFs", "Write merged PDF artifact"],
  steps: ["Validate inputs", "Merge PDFs in approved order"],
  expectedArtifacts: [
    {
      kind: "pdf",
      name: "merged.pdf",
      description: "Merged PDF artifact",
    },
  ],
  estimate: {
    creditMin: 1,
    creditMax: 1,
    runtimeSecondsMin: 5,
    runtimeSecondsMax: 300,
    limits: [
      {
        key: "max_input_files",
        label: "Maximum input files",
        value: "7 PDFs",
      },
    ],
  },
  risks: ["Encrypted PDFs cannot be merged."],
  createdAt: "2026-05-01T00:00:00.000Z",
  approvedAt: "2026-05-01T00:01:00.000Z",
};

void approvedPdfMergePlan;

const proposedWorkerPlan: ApprovedPlanSnapshot = {
  ...approvedPdfMergePlan,
  // @ts-expect-error approved plan snapshots must be approved.
  status: "proposed",
};

void proposedWorkerPlan;

const callbackSecretRef: SecretEnvironmentVariableName =
  "RAINCLOUD_WORKER_CALLBACK_SECRET";

void callbackSecretRef;

// @ts-expect-error callback secret refs must be env-var keys, not raw values.
const rawCallbackSecret: SecretEnvironmentVariableName = "raw-secret-value";

void rawCallbackSecret;

const workerPayload: WorkerRunPayload = {
  runId: "run_1",
  taskId: "task_1",
  approvedPlanId: "plan_1",
  approvedPlan: approvedPdfMergePlan,
  inputs: [
    {
      attachmentId: "att_1",
      kind: "pdf",
      blobKey: "inputs/task_1/q3-report.pdf",
      displayName: "Q3 Report.pdf",
      mimeType: "application/pdf",
    },
  ],
  artifactDestination: {
    container: "outputs",
    prefix: "outputs/task_1/run_1/",
  },
  callback: {
    url: "https://api.example.com/internal/worker-runs/run_1/events",
    secretRef: "RAINCLOUD_WORKER_CALLBACK_SECRET",
  },
};

void workerPayload;

const succeededEvent: WorkerEvent = {
  id: "event_1",
  runId: "run_1",
  taskId: "task_1",
  kind: "run_succeeded",
  occurredAt: "2026-05-01T00:02:00.000Z",
  summary: "Merged 7 PDFs.",
  artifactIds: ["artifact_1"],
};

void succeededEvent;

const failedEvent: WorkerEvent = {
  id: "event_2",
  runId: "run_1",
  taskId: "task_1",
  kind: "run_failed",
  occurredAt: "2026-05-01T00:02:00.000Z",
  failureReason: "Q2 Report.pdf is encrypted.",
};

void failedEvent;

const artifactUploadedEvent: WorkerEvent = {
  id: "event_3",
  runId: "run_1",
  taskId: "task_1",
  kind: "artifact_uploaded",
  occurredAt: "2026-05-01T00:02:00.000Z",
  artifact: {
    id: "artifact_1",
    taskId: "task_1",
    kind: "pdf",
    name: "merged.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    createdAt: "2026-05-01T00:02:00.000Z",
  },
};

void artifactUploadedEvent;

const claimedRun: WorkerRunClaimResult = {
  runId: "run_1",
  status: "claimed",
  workerRunStatus: "running",
};

void claimedRun;

const duplicateRun: WorkerRunClaimResult = {
  runId: "run_1",
  status: "duplicate",
  workerRunStatus: "succeeded",
};

void duplicateRun;

const duplicatePlanningRun: WorkerRunClaimResult = {
  runId: "run_1",
  status: "duplicate",
  workerRunStatus: "planning",
};

void duplicatePlanningRun;

const duplicateNeedsInputRun: WorkerRunClaimResult = {
  runId: "run_1",
  status: "duplicate",
  workerRunStatus: "needs_input",
};

void duplicateNeedsInputRun;

const shortTextQuestion: ClarifyingQuestion = {
  id: "question_1",
  taskId: "task_1",
  kind: "short_text",
  prompt: "What should the narrator sound like?",
  required: true,
  answer: "Warm and calm",
};

void shortTextQuestion;

const singleSelectQuestion: ClarifyingQuestion = {
  id: "question_2",
  taskId: "task_1",
  kind: "single_select",
  prompt: "Which format should Raincloud return?",
  required: true,
  options: [
    {
      id: "mp3",
      label: "MP3",
    },
  ],
  answer: "mp3",
};

void singleSelectQuestion;

const multiSelectQuestion: ClarifyingQuestion = {
  id: "question_3",
  taskId: "task_1",
  kind: "multi_select",
  prompt: "Which outputs should Raincloud include?",
  required: true,
  options: [
    {
      id: "audio",
      label: "Audio",
    },
    {
      id: "metadata",
      label: "Metadata",
    },
  ],
  answer: ["audio", "metadata"],
};

void multiSelectQuestion;

// @ts-expect-error select questions must provide options.
const selectQuestionWithoutOptions: ClarifyingQuestion = {
  id: "question_4",
  taskId: "task_1",
  kind: "single_select",
  prompt: "Which voice should Raincloud use?",
  required: true,
};

void selectQuestionWithoutOptions;

// @ts-expect-error multi-select answers must be string arrays.
const multiSelectWithStringAnswer: ClarifyingQuestion = {
  id: "question_5",
  taskId: "task_1",
  kind: "multi_select",
  prompt: "Which outputs should Raincloud include?",
  required: true,
  options: [
    {
      id: "audio",
      label: "Audio",
    },
  ],
  answer: "audio",
};

void multiSelectWithStringAnswer;

// @ts-expect-error short-text questions do not accept options.
const shortTextWithOptions: ClarifyingQuestion = {
  id: "question_6",
  taskId: "task_1",
  kind: "short_text",
  prompt: "What should the narrator sound like?",
  required: true,
  options: [
    {
      id: "warm",
      label: "Warm",
    },
  ],
};

void shortTextWithOptions;
