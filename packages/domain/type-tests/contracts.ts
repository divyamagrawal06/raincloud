import {
  isTerminalTaskStatus,
  isTerminalWorkerRunStatus,
  type ClarifyingQuestion,
  type TerminalTaskStatus,
  type TerminalWorkerRunStatus,
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
