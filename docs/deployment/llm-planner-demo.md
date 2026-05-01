# LLM Planner Demo

This demo exercises the Hermes planning layer without printing secrets.

```bash
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs
```

The script sends the seven-PDF smoke fixture and a natural-language reorder
request to the planner. It should return a reviewable plan with `Q3 Report.pdf`
before `Q2 Report.pdf`. It does not enqueue the worker run unless approval is
explicitly simulated:

```bash
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs --approve
```

To enqueue the approved payload into Azure Storage Queue using the active Azure
CLI or managed identity environment:

```bash
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs --enqueue
```

For the full PDF smoke path, first write the approved payload, then pass it to
the Azure smoke runner:

```bash
node --env-file=.env apps/api/scripts/demo-pdf-merge-agent.mjs \
  --approve \
  --payload-output .tmp/llm-pdf-merge-payload.approved.json \
  --callback-url https://httpbingo.org/status/202

AZURE_STORAGE_ACCOUNT_NAME=<storage-account> \
  bash infra/azure/run-pdf-merge-smoke.sh \
    --storage-account <storage-account> \
    --resource-group <resource-group> \
    --job-name hermes-worker-job \
    --payload .tmp/llm-pdf-merge-payload.approved.json \
    --output .tmp/llm-demo-merged.pdf
```

Required local environment:

- `OPENAI_API_KEY` for the planner model.
- `RAINCLOUD_OPENAI_MODEL` optionally overrides the default planner model.
- `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_QUEUE_NAME` for `--enqueue`.
- `RAINCLOUD_WORKER_CALLBACK_SECRET` is resolved by the worker container; the
  raw secret is never placed in the queued payload.
