import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("mobile integration handoff documents the next agent path", () => {
  const docPath = "docs/handoffs/2026-05-01-mobile-integration.md";

  assert.equal(existsSync(docPath), true);

  const doc = readFileSync(docPath, "utf8");

  for (const requiredText of [
    "Current State",
    "Mobile Integration Target",
    "API Work",
    "Mobile Work",
    "Callback And Status Loop",
    "Verification",
    "apps/api/src/server.mjs",
    "apps/mobile/src/screens/HomeScreen.tsx",
    "apps/mobile/src/components/TaskComposerCard.tsx",
    "OPENAI_API_KEY",
    "RAINCLOUD_WORKER_CALLBACK_SECRET",
    "/v1/pdf-merge/plans",
    "/v1/pdf-merge/approve",
  ]) {
    assert.match(doc, new RegExp(requiredText.replaceAll("/", "\\/")));
  }
});
