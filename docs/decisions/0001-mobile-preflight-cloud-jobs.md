# Decision 0001: Mobile Preflight Before Cloud Jobs

Date: 2026-04-30
Status: Accepted for MVP

## Context

Raincloud started as the idea of "mobile Codex": agents running on cloud instances, controlled from a phone. The market already has hosted agent and messenger-controlled products, so simply deploying an agent behind Telegram or a mobile chat UI is not differentiated enough for a hackathon or eventual product.

The product needs a sharper wedge.

## Decision

Raincloud will make **mobile preflight planning before cloud execution** the core product loop.

Every v1 task follows this pattern:

1. User describes a task from the phone.
2. Raincloud asks clarifying questions if needed.
3. Raincloud creates a plan with outputs, steps, permissions, limits, runtime, and credit estimate.
4. User approves the plan.
5. Raincloud starts an ephemeral cloud job.
6. Raincloud returns the finished artifact, PR, report, or failure summary.

No expensive worker starts before approval.

## Rationale

This creates differentiation:

- Hosted agents focus on access and execution.
- Raincloud focuses on mobile trust, planning, approval, compute dispatch, and artifacts.
- Users can understand what will happen before spending credits.
- Hackathon demos become clearer because the product shows its intelligence before the worker runs.
- Ephemeral workers stay cheap and safer than persistent user machines.

## Consequences

Positive:

- Better trust.
- Better cost control.
- Easier mobile UX.
- Clearer demo.
- Reduced accidental execution.
- Cleaner audit trail.

Tradeoffs:

- Adds one step before fire-and-forget execution.
- Requires a planning system before worker infrastructure.
- Some users may want instant execution for simple tasks.

The MVP accepts these tradeoffs because plan approval is central to Raincloud's differentiation.

## Alternatives Considered

### Hosted Persistent Workspace

Each user gets a long-lived cloud environment. This is powerful but more expensive, riskier, and closer to existing hosted agent products.

### Telegram-First Agent

Fast to build and familiar to users, but weakly differentiated and less aligned with a mobile-first app identity.

### Template-Only Task Runner

Cheaper and easier to support, but less magical and less faithful to the natural-language delegation vision.

## MVP Implication

The first implementation should optimize for:

- Plan quality.
- Approval UX.
- Clear task states.
- One or two impressive artifact-producing pipelines.
- Ephemeral worker execution after approval.
