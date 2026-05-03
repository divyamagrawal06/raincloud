import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("mobile integration entry points exist in codebase", () => {
  const paths = [
    "apps/api/src/server.mjs",
    "apps/mobile/src/screens/HomeScreen.tsx",
    "apps/mobile/src/components/TaskComposerCard.tsx",
  ];

  for (const p of paths) {
    assert.equal(existsSync(p), true);
  }

  const server = readFileSync("apps/api/src/server.mjs", "utf8");
  const planner = readFileSync("apps/api/src/pdfMergePlanner.mjs", "utf8");

  assert.ok(server.includes("pdf-merge"));
  assert.match(server, /RAINCLOUD_WORKER_CALLBACK_SECRET/);
  assert.match(planner, /OPENAI_API_KEY/);
});
