# Decision 0002: Task Runtime Boundaries

Date: 2026-05-01
Status: Accepted for MVP

## Context

Decision 0001 established Raincloud's core loop: mobile preflight planning before cloud execution. The next architectural risk is boundary blur. If the mobile app, API, planner, and worker all share responsibility for task state or execution policy, the product becomes harder to reason about and easier to make unsafe or expensive.

Raincloud needs clear runtime ownership before implementation begins.

## Decision

Raincloud will split task runtime responsibility across four boundaries:

1. **Mobile app as control surface**
   The app captures intent, inputs, clarifying answers, approvals, cancellations, and result viewing. It does not execute jobs or own canonical state.

2. **API backend as control plane**
   The API owns authentication, authorization, task lifecycle, plan records, approvals, queueing, worker events, artifact metadata, notifications, and usage accounting.

3. **Planner as preflight runtime**
   The planner turns a draft task into clarifying questions or a proposed plan with steps, inputs, permissions, estimates, limits, assumptions, and risks. It does not launch workers or perform heavyweight execution.

4. **Worker as execution runtime**
   The worker runs one approved plan snapshot in an isolated, finite job. It reports milestones, uploads artifacts, requests bounded input when blocked, and returns success or failure. It does not broaden scope beyond the approved plan or own product policy.

The approved plan snapshot is the handoff contract between preflight and execution.

## Rationale

This split reinforces Raincloud's product promise:

- Users approve before expensive compute starts.
- The phone can stay a compact trust and review surface.
- The API can enforce policy consistently.
- The planner can stay cheap and fast.
- Workers can be isolated and disposable.
- Artifacts and failures can be audited against the approved plan.

The boundary also keeps Hermes in the right role. Hermes is the agentic execution substrate inside a worker, not the Raincloud product brain, billing system, or approval authority.

## Boundary Rules

- Only the API may change canonical task state.
- Only the API may enqueue a worker.
- Only an approved plan may produce a worker run.
- Planner output is reviewable but not executable until approval.
- Worker callbacks are events for the API to interpret.
- Worker credentials and files are scoped to one approved run.
- Worker requests for input must remain inside the approved scope.
- Any material scope change requires a new plan revision and approval.

## Consequences

Positive:

- Clearer implementation ownership.
- Better auditability.
- Safer credential and file handling.
- Stronger cost controls.
- Easier mobile UX because status comes from one API.
- Easier future support for multiple worker runtimes.

Tradeoffs:

- More explicit contracts are needed between components.
- Some simple tasks still pass through plan approval.
- The API must handle more orchestration logic.
- Worker implementation must report structured events instead of mutating product state directly.

The MVP accepts these tradeoffs because user trust, cost control, and runtime isolation are core to Raincloud's differentiation.

## Alternatives Considered

### Worker-Centric Runtime

The API would hand a prompt to the worker and let the worker plan, execute, and report. This is faster to prototype but weakens mobile preflight, makes approval less meaningful, and gives the worker too much policy authority.

### Mobile-Orchestrated Runtime

The app would directly coordinate planning, queueing, and worker status. This makes early demos feel simple but creates fragile mobile state, harder retries, and unsafe coupling between the phone and long-running cloud jobs.

### Planner As Full Agent

The planner would inspect inputs deeply and perform partial execution before approval. This can improve plan quality, but it risks spending credits, touching user data, or mutating external systems before the user approves.

### Persistent User Workspace

Each user would have a standing runtime that can plan and execute continuously. This is powerful but more expensive, harder to isolate, and less aligned with the MVP's finite approved-job model.

## Non-Goals

- Define final database schema.
- Define API endpoint names.
- Choose a queue provider.
- Define worker container images.
- Implement code.
- Support persistent per-user agents in v1.

## Related Documents

- [Architecture overview](../architecture.md)
- [Runtime architecture](../architecture/runtime.md)
- [Decision 0001: Mobile Preflight Before Cloud Jobs](0001-mobile-preflight-cloud-jobs.md)
