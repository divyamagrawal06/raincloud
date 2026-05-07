import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveWorkerCallbackBaseUrl } from "../apps/api/src/server.mjs";

const jsonResponse = (body, ok = true) => ({
  ok,
  json: async () => body,
});

test("worker callback base URL uses an explicit public API URL", async () => {
  const calls = [];
  const baseUrl = await resolveWorkerCallbackBaseUrl({
    env: {
      RAINCLOUD_API_URL: "https://api.example.test/",
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      return { ok: true };
    },
  });

  assert.equal(baseUrl, "https://api.example.test");
  assert.deepEqual(calls, ["https://api.example.test/health"]);
});

test("worker callback base URL discovers the active ngrok tunnel for local API URLs", async () => {
  const calls = [];
  const baseUrl = await resolveWorkerCallbackBaseUrl({
    env: {
      RAINCLOUD_API_URL: "http://localhost:3000",
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      return jsonResponse({
        tunnels: [
          { public_url: "http://legacy.ngrok-free.app" },
          { public_url: "https://active.ngrok-free.app" },
        ],
      });
    },
  });

  assert.equal(baseUrl, "https://active.ngrok-free.app");
  assert.deepEqual(calls, ["http://127.0.0.1:4040/api/tunnels"]);
});

test("worker callback base URL refreshes stale ngrok URLs from the active tunnel", async () => {
  const baseUrl = await resolveWorkerCallbackBaseUrl({
    env: {
      RAINCLOUD_API_URL: "https://stale.ngrok-free.app",
    },
    fetchImpl: async () =>
      jsonResponse({
        tunnels: [{ public_url: "https://current.ngrok-free.app" }],
      }),
  });

  assert.equal(baseUrl, "https://current.ngrok-free.app");
});

test("worker callback base URL keeps a reachable configured ngrok URL", async () => {
  const calls = [];
  const baseUrl = await resolveWorkerCallbackBaseUrl({
    env: {
      RAINCLOUD_API_URL: "https://active.ngrok-free.app",
    },
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url) === "http://127.0.0.1:4040/api/tunnels") {
        return jsonResponse({ tunnels: [] });
      }
      return { ok: true };
    },
  });

  assert.equal(baseUrl, "https://active.ngrok-free.app");
  assert.deepEqual(calls, [
    "http://127.0.0.1:4040/api/tunnels",
    "https://active.ngrok-free.app/health",
  ]);
});

test("worker callback base URL rejects local URLs when no tunnel is available", async () => {
  await assert.rejects(
    () =>
      resolveWorkerCallbackBaseUrl({
        env: {
          RAINCLOUD_API_URL: "http://localhost:3000",
        },
        fetchImpl: async () => jsonResponse({ tunnels: [] }),
      }),
    /Start ngrok with "ngrok http 3000"/,
  );
});

test("worker callback base URL rejects stale ngrok URLs when no tunnel is available", async () => {
  await assert.rejects(
    () =>
      resolveWorkerCallbackBaseUrl({
        env: {
          RAINCLOUD_API_URL: "https://stale.ngrok-free.app",
        },
        fetchImpl: async (url) => {
          if (String(url) === "http://127.0.0.1:4040/api/tunnels") {
            return jsonResponse({ tunnels: [] });
          }
          throw new TypeError("configured callback URL is unreachable");
        },
      }),
    /ngrok tunnel is not active/,
  );
});

test("worker callback base URL rejects unreachable public URLs", async () => {
  await assert.rejects(
    () =>
      resolveWorkerCallbackBaseUrl({
        env: {
          RAINCLOUD_API_URL: "https://stale-tunnel.example.test",
        },
        fetchImpl: async () => {
          throw new TypeError("public URL is unreachable");
        },
      }),
    /RAINCLOUD_API_URL is not reachable/,
  );
});
