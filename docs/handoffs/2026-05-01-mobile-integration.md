# Handoff: Mobile PDF Merge Integration

This document is for the next agent continuing Raincloud after the Azure worker and LLM planner MVPs. Treat it as the shortest path from the current demo to a mobile-driven end-to-end PDF merge flow.

## Current State

`main` includes the Azure worker handoff and the LLM PDF merge planner.

Important files:

- `apps/api/src/server.mjs`: tiny HTTP API with `POST /v1/pdf-merge/plans`, `POST /v1/pdf-merge/approve`, and `GET /health`.
- `apps/api/src/pdfMergePlanner.mjs`: OpenAI-backed planner that returns either `needs_input` clarifying questions or a `plan_review` with ordered attachments.
- `apps/api/src/dispatch.mjs`: approved worker payload serialization and Azure Storage Queue enqueue logic.
- `apps/api/scripts/demo-pdf-merge-agent.mjs`: local CLI demo that turns the seven-PDF fixture into a reviewable/approved payload.
- `apps/worker/src/worker.mjs`: Azure worker that reads one approved payload, merges PDFs with `pdf-lib`, uploads the output PDF, posts worker callbacks, and deletes the queue message after callbacks succeed.
- `infra/azure/run-pdf-merge-smoke.sh`: full cloud smoke runner for approved payloads.
- `apps/mobile/src/screens/HomeScreen.tsx`: current composer entry point; it only logs the prompt.
- `apps/mobile/src/components/TaskComposerCard.tsx`: current text composer and placeholder attach button.
- `apps/mobile/src/fixtures.ts`: mocked task/plan/artifact data used by mobile screens.

Current limitations:

- The API is local-only and has no durable store.
- The API does not yet implement upload endpoints, status endpoints, artifact download endpoints, or `/internal/worker-runs/:runId/events`.
- The mobile app does not yet pick PDFs, upload files, call the API, show clarifying questions, review plans, approve runs, poll status, or download artifacts.
- The worker callback secret must stay server-side. Queue payloads carry `callback.secretRef`, not raw secret values.

## Mobile Integration Target

Build this first user path:

1. User opens mobile and attaches up to seven PDFs from the composer.
2. User writes a prompt such as `merge these, do q3 report before q2 report`.
3. Mobile uploads PDFs or asks the API for upload URLs, then sends uploaded attachment metadata to `POST /v1/pdf-merge/plans`.
4. If the API returns `needs_input`, mobile shows the clarifying question and sends the answer back to planning.
5. If the API returns `plan_review`, mobile shows ordered PDFs, assumptions, steps, estimated limits, expected artifact name, and an Approve action.
6. User can refine/reorder with a natural-language prompt; mobile re-calls planning with the same attachments and the additional instruction.
7. User approves; mobile calls `POST /v1/pdf-merge/approve`.
8. API queues the worker payload and returns `queued` with `taskId` and `runId`.
9. Mobile shows run status and eventually exposes the returned merged PDF.

Keep the MVP narrow: PDF merge only, maximum seven PDFs, natural-language reorder only through the planner, one output PDF.

## API Work

The current API surface is enough for the CLI demo, but not for mobile. Add a thin durable control plane before doing much UI work.

Minimum endpoints:

- `POST /v1/pdf-merge/uploads`: create a task and upload PDFs. Either accept multipart uploads in the API and write to Azure Blob, or return short-lived SAS upload URLs. The result must include attachment metadata shaped for the planner: `id`, `kind`, `displayName`, `mimeType`, `blobKey`, `uploadedOrder`, and `sizeBytes`.
- `POST /v1/pdf-merge/plans`: keep the existing planner endpoint, but persist tasks, attachments, clarifying questions, and proposed plans.
- `POST /v1/pdf-merge/approve`: persist the approved plan, create a worker run, enqueue the payload, and return `queued`.
- `POST /internal/worker-runs/:runId/events`: validate `Authorization: Bearer <RAINCLOUD_WORKER_CALLBACK_SECRET>`, persist worker events, update run/task state, and attach uploaded artifacts.
- `GET /v1/tasks/:taskId`: return task status, active plan, clarifying questions, run status, and artifact summaries for mobile polling.
- `GET /v1/artifacts/:artifactId/download`: return a signed download URL or stream the merged PDF.

Implementation notes:

- Reuse domain types from `packages/domain/src/index.ts`; add new types there only when a contract is shared by API and mobile.
- Keep `OPENAI_API_KEY` and `RAINCLOUD_WORKER_CALLBACK_SECRET` out of logs, queue payloads, mobile config, and PR text.
- The planner request should receive metadata only, not PDF contents.
- The worker already rejects raw callback secrets and bad payloads; preserve that boundary.
- Until Supabase or another store is wired, a small file-backed or in-memory store is acceptable only for local demo mode. Make that limitation explicit in code and docs.

## Mobile Work

Start in `apps/mobile/src/screens/HomeScreen.tsx` and `apps/mobile/src/components/TaskComposerCard.tsx`.

Suggested slices:

1. Add an API client module, for example `apps/mobile/src/api/raincloudClient.ts`, using `EXPO_PUBLIC_RAINCLOUD_API_URL`.
2. Add PDF selection behind the attach button. Prefer Expo-compatible document picking and keep selected files in local screen state.
3. Add upload/planning orchestration from Home:
   - upload selected PDFs,
   - call `POST /v1/pdf-merge/plans`,
   - route to a plan review state when ready,
   - route to clarifying-question UI when needed.
4. Add a PDF merge plan review screen or modal:
   - ordered PDF list,
   - natural-language reorder/refinement input,
   - assumptions and steps,
   - expected output file,
   - Approve button.
5. Add queued/running/succeeded states to the existing task screens by replacing or augmenting `apps/mobile/src/fixtures.ts`.
6. Add artifact download/open behavior once the API exposes signed URLs.

Mobile UX requirements:

- Never send directly from prompt to worker; always show clarifying questions or plan review first.
- Preserve natural-language reorder behavior. The example `do Q3 Report before Q2 Report` should reorder the displayed plan before approval.
- Keep manual ordering optional for the MVP. Natural-language reorder is the must-have.
- Keep secret values out of the app. Mobile should never see `OPENAI_API_KEY` or `RAINCLOUD_WORKER_CALLBACK_SECRET`.

## Callback And Status Loop

The worker already posts:

- `artifact_uploaded`
- `run_succeeded`
- `run_failed`

The missing piece is the API receiver. Implement `/internal/worker-runs/:runId/events` before treating mobile status as real.

Expected behavior:

- Authenticate with `RAINCLOUD_WORKER_CALLBACK_SECRET`.
- Reject event bodies whose `runId` does not match the URL.
- Make callback handling idempotent by event `id` and artifact `id`.
- On `artifact_uploaded`, create or update an `Artifact`.
- On `run_succeeded`, mark the worker run and task as `succeeded`.
- On `run_failed`, mark the worker run and task as `failed` and save the failure reason.
- Return `2xx` only after persistence succeeds, because the worker deletes the queue message only after callback success.

## Local Demo Commands

Do not read or print `.env`. Let commands load it.

Planner-only:

```sh
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs
```

Planner plus approved payload:

```sh
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs \
  --approve \
  --payload-output .tmp/llm-pdf-merge-payload.approved.json \
  --callback-url https://httpbingo.org/status/202
```

Full Azure smoke with an approved payload:

```sh
AZURE_STORAGE_ACCOUNT_NAME=<storage-account> \
  bash infra/azure/run-pdf-merge-smoke.sh \
    --storage-account <storage-account> \
    --resource-group <resource-group> \
    --job-name hermes-worker-job \
    --payload .tmp/llm-pdf-merge-payload.approved.json \
    --output .tmp/llm-demo-merged.pdf
```

## Verification

Run these before handing work back:

```sh
npm test
npm run typecheck
bash -n infra/azure/provision-mvp.sh
bash -n infra/azure/deploy-worker-job.sh
bash -n infra/azure/enqueue-worker-run.sh
bash -n infra/azure/run-pdf-merge-smoke.sh
git diff --check
```

For mobile UI changes, also run:

```sh
npm --workspace @raincloud/mobile run typecheck
```

If a browser/mobile simulator is used, verify the PDF merge flow visually from prompt through plan review and queued state.

## Suggested Next PR Order

1. API durable store and worker callback receiver.
2. API upload endpoint or SAS upload endpoint.
3. Mobile API client and PDF picker.
4. Mobile plan review, clarifying-question, and approval UI.
5. Mobile status polling and artifact download/opening.
6. Azure deployment for the API service, then update mobile `EXPO_PUBLIC_RAINCLOUD_API_URL`.

Keep each PR small enough that the cloud smoke task remains easy to rerun.
