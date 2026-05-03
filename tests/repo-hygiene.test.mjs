import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test(".gitignore excludes local tooling and generated output", () => {
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(gitignore, /^graphify-out\/$/m);
  assert.match(gitignore, /^docs\/diagrams\/$/m);
  assert.match(gitignore, /^\/scripts\/$/m);
});
