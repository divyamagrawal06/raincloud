export const taskStatuses = [
  "draft",
  "clarifying",
  "plan_review",
  "queued",
  "planning",
  "running",
  "needs_input",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const terminalTaskStatuses = [
  "succeeded",
  "failed",
  "canceled",
] as const satisfies readonly TaskStatus[];

export type TerminalTaskStatus = (typeof terminalTaskStatuses)[number];

const terminalTaskStatusSet = new Set<TaskStatus>(terminalTaskStatuses);

export const isTerminalTaskStatus = (
  status: string,
): status is TerminalTaskStatus =>
  terminalTaskStatusSet.has(status as TaskStatus);

export const taskLanes = [
  "code_pr",
  "csv_cleanup",
  "video_processing",
  "audio_generation",
  "research_packet",
  "file_processing",
  "pdf_merge",
] as const;

export type TaskLane = (typeof taskLanes)[number];

export const planStatuses = [
  "proposed",
  "approved",
  "rejected",
  "superseded",
] as const;

export type PlanStatus = (typeof planStatuses)[number];

export const clarifyingQuestionKinds = [
  "short_text",
  "single_select",
  "multi_select",
] as const;

export type ClarifyingQuestionKind = (typeof clarifyingQuestionKinds)[number];

export const artifactKinds = [
  "pull_request",
  "downloadable_file",
  "report",
  "audio",
  "video",
  "dataset",
  "pdf",
] as const;

export type ArtifactKind = (typeof artifactKinds)[number];

export const attachmentKinds = ["pdf"] as const;

export type AttachmentKind = (typeof attachmentKinds)[number];

export const workerRunStatuses = [
  "queued",
  "planning",
  "running",
  "needs_input",
  "succeeded",
  "failed",
  "canceled",
] as const;

export type WorkerRunStatus = (typeof workerRunStatuses)[number];

export const terminalWorkerRunStatuses = [
  "succeeded",
  "failed",
  "canceled",
] as const satisfies readonly WorkerRunStatus[];

export type TerminalWorkerRunStatus =
  (typeof terminalWorkerRunStatuses)[number];

const terminalWorkerRunStatusSet = new Set<WorkerRunStatus>(
  terminalWorkerRunStatuses,
);

export const isTerminalWorkerRunStatus = (
  status: string,
): status is TerminalWorkerRunStatus =>
  terminalWorkerRunStatusSet.has(status as WorkerRunStatus);

export const workerEventKinds = [
  "run_started",
  "milestone",
  "artifact_uploaded",
  "usage_reported",
  "input_requested",
  "run_succeeded",
  "run_failed",
] as const;

export type WorkerEventKind = (typeof workerEventKinds)[number];

export const terminalWorkerEventKinds = [
  "run_succeeded",
  "run_failed",
] as const satisfies readonly WorkerEventKind[];

export type TerminalWorkerEventKind =
  (typeof terminalWorkerEventKinds)[number];

const terminalWorkerEventKindSet = new Set<WorkerEventKind>(
  terminalWorkerEventKinds,
);

export const isTerminalWorkerEventKind = (
  kind: string,
): kind is TerminalWorkerEventKind =>
  terminalWorkerEventKindSet.has(kind as WorkerEventKind);

export const workerRunClaimStatuses = ["claimed", "duplicate"] as const;

export type WorkerRunClaimStatus = (typeof workerRunClaimStatuses)[number];

export type IsoDateTime = string;

export type PdfMimeType = "application/pdf";

export type AttachmentMimeType = PdfMimeType;

export type SecretEnvironmentVariableName =
  `${Uppercase<string>}_${"SECRET" | "TOKEN" | "KEY"}`;

export interface Task {
  id: string;
  ownerId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  lane?: TaskLane;
  activePlanId?: string;
  artifactIds: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Attachment {
  id: string;
  taskId: string;
  kind: AttachmentKind;
  displayName: string;
  originalName: string;
  mimeType: AttachmentMimeType;
  sizeBytes: number;
  blobKey: string;
  uploadedOrder: number;
  createdAt: IsoDateTime;
}

export interface TaskPlan {
  id: string;
  taskId: string;
  status: PlanStatus;
  lane: TaskLane;
  goal: string;
  assumptions: string[];
  requiredInputs: string[];
  requiredPermissions: string[];
  steps: string[];
  expectedArtifacts: ExpectedArtifact[];
  estimate: UsageEstimate;
  risks: string[];
  createdAt: IsoDateTime;
  approvedAt?: IsoDateTime;
}

export interface ApprovedPlanSnapshot extends TaskPlan {
  status: "approved";
  approvedAt: IsoDateTime;
}

export interface ExpectedArtifact {
  kind: ArtifactKind;
  name: string;
  description: string;
}

export interface BaseClarifyingQuestion {
  id: string;
  taskId: string;
  prompt: string;
  required: boolean;
  answeredAt?: IsoDateTime;
}

export interface ShortTextClarifyingQuestion extends BaseClarifyingQuestion {
  kind: "short_text";
  options?: never;
  answer?: string;
}

export interface SingleSelectClarifyingQuestion
  extends BaseClarifyingQuestion {
  kind: "single_select";
  options: ClarifyingQuestionOption[];
  answer?: string;
}

export interface MultiSelectClarifyingQuestion extends BaseClarifyingQuestion {
  kind: "multi_select";
  options: ClarifyingQuestionOption[];
  answer?: string[];
}

export type ClarifyingQuestion =
  | ShortTextClarifyingQuestion
  | SingleSelectClarifyingQuestion
  | MultiSelectClarifyingQuestion;

export interface ClarifyingQuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface Artifact {
  id: string;
  taskId: string;
  kind: ArtifactKind;
  name: string;
  description?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  createdAt: IsoDateTime;
  expiresAt?: IsoDateTime;
}

export interface UsageEstimate {
  creditMin: number;
  creditMax: number;
  runtimeSecondsMin?: number;
  runtimeSecondsMax?: number;
  externalSpendUsdMax?: number;
  limits: TaskLimit[];
}

export interface TaskLimit {
  key: string;
  label: string;
  value: string;
}

export interface WorkerRun {
  id: string;
  taskId: string;
  planId: string;
  status: WorkerRunStatus;
  createdAt: IsoDateTime;
  startedAt?: IsoDateTime;
  finishedAt?: IsoDateTime;
  failureReason?: string;
}

export interface WorkerPayloadInput {
  attachmentId: string;
  kind: AttachmentKind;
  blobKey: string;
  displayName: string;
  mimeType: AttachmentMimeType;
}

export interface WorkerArtifactDestination {
  container: string;
  prefix: string;
}

export interface WorkerCallbackTarget {
  url: string;
  secretRef: SecretEnvironmentVariableName;
}

export interface WorkerRunPayload {
  runId: string;
  taskId: string;
  approvedPlanId: string;
  approvedPlan: ApprovedPlanSnapshot;
  inputs: WorkerPayloadInput[];
  artifactDestination: WorkerArtifactDestination;
  callback: WorkerCallbackTarget;
}

export interface BaseWorkerEvent {
  id: string;
  runId: string;
  taskId: string;
  kind: WorkerEventKind;
  occurredAt: IsoDateTime;
}

export interface RunStartedWorkerEvent extends BaseWorkerEvent {
  kind: "run_started";
}

export interface MilestoneWorkerEvent extends BaseWorkerEvent {
  kind: "milestone";
  message: string;
}

export interface ArtifactUploadedWorkerEvent extends BaseWorkerEvent {
  kind: "artifact_uploaded";
  artifact: Artifact;
}

export interface WorkerUsageReport {
  creditCost?: number;
  runtimeSeconds?: number;
  externalSpendUsd?: number;
}

export interface UsageReportedWorkerEvent extends BaseWorkerEvent {
  kind: "usage_reported";
  usage: WorkerUsageReport;
}

export interface InputRequestedWorkerEvent extends BaseWorkerEvent {
  kind: "input_requested";
  question: ClarifyingQuestion;
}

export interface RunSucceededWorkerEvent extends BaseWorkerEvent {
  kind: "run_succeeded";
  summary: string;
  artifactIds: string[];
}

export interface RunFailedWorkerEvent extends BaseWorkerEvent {
  kind: "run_failed";
  failureReason: string;
}

export type WorkerEvent =
  | RunStartedWorkerEvent
  | MilestoneWorkerEvent
  | ArtifactUploadedWorkerEvent
  | UsageReportedWorkerEvent
  | InputRequestedWorkerEvent
  | RunSucceededWorkerEvent
  | RunFailedWorkerEvent;

export type DuplicateWorkerRunStatus = "running" | TerminalWorkerRunStatus;

export type WorkerRunClaimResult =
  | {
      runId: string;
      status: "claimed";
      workerRunStatus: "running";
    }
  | {
      runId: string;
      status: "duplicate";
      workerRunStatus: DuplicateWorkerRunStatus;
    };
