import { test } from "node:test";
import assert from "node:assert/strict";

import {
  artifactKinds,
  isTerminalTaskStatus,
  isTerminalWorkerRunStatus,
  taskLanes,
  taskStatuses,
  terminalWorkerRunStatuses,
  workerRunStatuses,
} from "../packages/domain/dist/index.js";

test("domain exports the agreed task lifecycle", () => {
  assert.deepEqual(taskStatuses, [
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
  ]);

  assert.equal(isTerminalTaskStatus("draft"), false);
  assert.equal(isTerminalTaskStatus("running"), false);
  assert.equal(isTerminalTaskStatus("succeeded"), true);
  assert.equal(isTerminalTaskStatus("failed"), true);
  assert.equal(isTerminalTaskStatus("canceled"), true);

  const databaseStatus = "succeeded";
  assert.equal(isTerminalTaskStatus(databaseStatus), true);
  assert.equal(isTerminalTaskStatus("unknown_status"), false);
});

test("domain exports first MVP task lanes", () => {
  assert.deepEqual(taskLanes, [
    "code_pr",
    "csv_cleanup",
    "video_processing",
    "audio_generation",
    "research_packet",
    "file_processing",
  ]);
});

test("domain exports artifact and worker run contracts", () => {
  assert.deepEqual(artifactKinds, [
    "pull_request",
    "downloadable_file",
    "report",
    "audio",
    "video",
    "dataset",
  ]);

  assert.deepEqual(workerRunStatuses, [
    "queued",
    "planning",
    "running",
    "needs_input",
    "succeeded",
    "failed",
    "canceled",
  ]);

  assert.deepEqual(terminalWorkerRunStatuses, [
    "succeeded",
    "failed",
    "canceled",
  ]);

  const databaseRunStatus = "failed";
  assert.equal(isTerminalWorkerRunStatus(databaseRunStatus), true);
  assert.equal(isTerminalWorkerRunStatus("running"), false);
  assert.equal(isTerminalWorkerRunStatus("unknown_status"), false);
});
