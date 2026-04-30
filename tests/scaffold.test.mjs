import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("root package defines the Raincloud workspace", () => {
  const pkg = readJson("package.json");

  assert.equal(pkg.name, "raincloud");
  assert.equal(pkg.private, true);
  assert.deepEqual(pkg.workspaces, ["apps/*", "packages/*"]);
  assert.equal(pkg.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(pkg.scripts.typecheck, "npm run typecheck --workspaces --if-present");
});

test("mobile package is an Expo app workspace", () => {
  const pkg = readJson("apps/mobile/package.json");

  assert.equal(pkg.name, "@raincloud/mobile");
  assert.equal(pkg.private, true);
  assert.equal(pkg.scripts.start, "expo start");
  assert.ok(pkg.dependencies.expo);
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies["react-native"]);
  assert.ok(pkg.devDependencies.typescript);
});

test("mobile app config identifies the app", () => {
  const config = readJson("apps/mobile/app.json");

  assert.equal(config.expo.name, "Raincloud");
  assert.equal(config.expo.slug, "raincloud");
  assert.equal(config.expo.scheme, "raincloud");
  assert.equal(config.expo.orientation, "portrait");
});

test("mobile app entry exists", () => {
  assert.equal(existsSync("apps/mobile/App.tsx"), true);
});
