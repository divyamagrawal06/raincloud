import type { Artifact, Attachment, ClarifyingQuestion, Task, TaskPlan, WorkerRun } from '@raincloud/domain';

const BASE_URL = (process.env['EXPO_PUBLIC_RAINCLOUD_API_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');

export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

export type UploadResult = {
  taskId: string;
  attachments: Attachment[];
};

export type PlanResult =
  | {
      status: 'plan_review';
      taskId: string;
      lane: string;
      model: string;
      summary: string;
      plan: TaskPlan;
      clarifyingQuestions: ClarifyingQuestion[];
      orderedAttachments: Attachment[];
    }
  | {
      status: 'needs_input';
      taskId: string;
      lane: string;
      model: string;
      summary: string;
      clarifyingQuestions: ClarifyingQuestion[];
      orderedAttachments: never[];
    };

export type ApproveResult = {
  status: 'queued';
  taskId: string;
  runId: string;
  planId: string;
};

export type TaskResponse = {
  task: Task;
  plan: TaskPlan | null;
  run: WorkerRun | null;
  artifacts: Artifact[];
};

const throwOnError = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`API ${response.status}: ${text}`);
  }
};

export const uploadPdfs = async (files: PickedFile[]): Promise<UploadResult> => {
  const formData = new FormData();
  for (const file of files) {
    // React Native FormData requires the file object cast — the uri/name/type shape
    // is not a standard Web Blob but React Native's fetch implementation handles it.
    formData.append('files', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/pdf' } as unknown as Blob);
  }
  const response = await fetch(`${BASE_URL}/v1/pdf-merge/uploads`, {
    method: 'POST',
    body: formData,
  });
  await throwOnError(response);
  return response.json() as Promise<UploadResult>;
};

export const createPlan = async (params: {
  taskId: string;
  prompt: string;
  answers?: Record<string, unknown>;
}): Promise<PlanResult> => {
  const response = await fetch(`${BASE_URL}/v1/pdf-merge/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  await throwOnError(response);
  return response.json() as Promise<PlanResult>;
};

export const approvePlan = async (params: {
  taskId: string;
  planId: string;
}): Promise<ApproveResult> => {
  const response = await fetch(`${BASE_URL}/v1/pdf-merge/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  await throwOnError(response);
  return response.json() as Promise<ApproveResult>;
};

export const getTask = async (taskId: string): Promise<TaskResponse> => {
  const response = await fetch(`${BASE_URL}/v1/tasks/${taskId}`);
  await throwOnError(response);
  return response.json() as Promise<TaskResponse>;
};

export const getArtifactDownloadUrl = (_artifactId: string): { url: string } => {
  // The download endpoint streams the PDF directly — open this URL in the system browser/viewer.
  return { url: `${BASE_URL}/v1/artifacts/${_artifactId}/download` };
};
