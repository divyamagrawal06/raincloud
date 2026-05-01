import { test } from "node:test";
import assert from "node:assert/strict";

import {
  artifactKinds,
  attachmentKinds,
  isTerminalWorkerEventKind,
  isTerminalTaskStatus,
  isTerminalWorkerRunStatus,
  taskLanes,
  taskStatuses,
  terminalWorkerEventKinds,
  terminalWorkerRunStatuses,
  workerEventKinds,
  workerRunClaimStatuses,
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
    "pdf_merge",
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
    "pdf",
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

test("domain exports cloud worker handoff contracts", () => {
  assert.deepEqual(attachmentKinds, ["pdf"]);

  assert.deepEqual(workerEventKinds, [
    "run_started",
    "milestone",
    "artifact_uploaded",
    "usage_reported",
    "input_requested",
    "run_succeeded",
    "run_failed",
  ]);

  assert.deepEqual(terminalWorkerEventKinds, [
    "run_succeeded",
    "run_failed",
  ]);

  assert.equal(isTerminalWorkerEventKind("run_started"), false);
  assert.equal(isTerminalWorkerEventKind("run_succeeded"), true);
  assert.equal(isTerminalWorkerEventKind("run_failed"), true);
  assert.equal(isTerminalWorkerEventKind("unknown_event"), false);

  assert.deepEqual(workerRunClaimStatuses, ["claimed", "duplicate"]);
});
