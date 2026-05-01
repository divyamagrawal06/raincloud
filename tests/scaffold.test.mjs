import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const readText = (path) => readFileSync(path, "utf8");

test("root package defines the Raincloud workspace", () => {
  const pkg = readJson("package.json");

  assert.equal(pkg.name, "raincloud");
  assert.equal(pkg.private, true);
  assert.deepEqual(pkg.workspaces, ["apps/*", "packages/*"]);
  assert.equal(pkg.scripts.build, "npm run build --workspaces --if-present");
  assert.equal(
    pkg.scripts.test,
    "npm run build --workspaces --if-present && node --test tests/*.test.mjs",
  );
  assert.equal(pkg.scripts.typecheck, "npm run typecheck --workspaces --if-present");
});

test("mobile package is an Expo app workspace", () => {
  const pkg = readJson("apps/mobile/package.json");

  assert.equal(pkg.name, "@raincloud/mobile");
  assert.equal(pkg.private, true);
  assert.equal(pkg.scripts.start, "expo start");
  assert.ok(pkg.dependencies.expo);
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies["react-dom"]);
  assert.ok(pkg.dependencies["react-native"]);
  assert.ok(pkg.dependencies["react-native-web"]);
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

test("root env example documents cloud dispatch configuration", () => {
  assert.equal(existsSync(".env.example"), true);

  const envExample = readText(".env.example");
  const expectedKeys = [
    "AZURE_SUBSCRIPTION_ID",
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "AZURE_RESOURCE_GROUP",
    "AZURE_LOCATION",
    "AZURE_STORAGE_ACCOUNT_NAME",
    "AZURE_STORAGE_QUEUE_NAME",
    "AZURE_INPUTS_CONTAINER_NAME",
    "AZURE_OUTPUTS_CONTAINER_NAME",
    "AZURE_CONTAINER_REGISTRY_NAME",
    "AZURE_CONTAINER_APPS_ENVIRONMENT_NAME",
    "AZURE_HERMES_JOB_NAME",
    "RAINCLOUD_API_URL",
    "RAINCLOUD_WORKER_CALLBACK_SECRET",
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ];

  for (const key of expectedKeys) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"));
  }
});
