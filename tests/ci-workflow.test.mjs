import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const workflowPath = ".github/workflows/ci.yml";

test("ci workflow runs required quality gates", () => {
  assert.equal(existsSync(workflowPath), true);

  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npx expo-doctor/);
  assert.match(workflow, /npx expo export --platform ios/);
  assert.match(workflow, /npx expo export --platform web/);
});
