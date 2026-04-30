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
  status: TaskStatus,
): status is TerminalTaskStatus => terminalTaskStatusSet.has(status);

export const taskLanes = [
  "code_pr",
  "csv_cleanup",
  "video_processing",
  "audio_generation",
  "research_packet",
  "file_processing",
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
] as const;

export type ArtifactKind = (typeof artifactKinds)[number];

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

export type IsoDateTime = string;

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

export interface ExpectedArtifact {
  kind: ArtifactKind;
  name: string;
  description: string;
}

export interface ClarifyingQuestion {
  id: string;
  taskId: string;
  kind: ClarifyingQuestionKind;
  prompt: string;
  required: boolean;
  options?: ClarifyingQuestionOption[];
  answer?: string | string[];
  answeredAt?: IsoDateTime;
}

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
  startedAt?: IsoDateTime;
  finishedAt?: IsoDateTime;
  failureReason?: string;
}
