import { test } from "node:test";
import assert from "node:assert/strict";

import {
  artifactKinds,
  isTerminalTaskStatus,
  taskLanes,
  taskStatuses,
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
});
