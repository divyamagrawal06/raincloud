# Raincloud

Raincloud is a mobile-first async AI task platform. A user describes a task from a phone, Raincloud clarifies the request, shows an execution plan, runs the approved job on cloud compute, and notifies the user when the result is ready.

This repository currently contains foundational product and architecture documents only. No application code has been added yet.

## Product Thesis

Most agent tools assume the user has a laptop, terminal, IDE, or always-on personal machine. Raincloud starts from the opposite assumption: the phone is the primary computer. The product is designed for people who want to delegate real work, lock their phone, and come back to an artifact, PR, report, or processed file.

Raincloud is not just an agent in a chat app. The differentiator is the planning contract before compute:

1. The user describes a task naturally.
2. Raincloud asks clarifying questions when the request is underspecified.
3. Raincloud presents a plan with expected outputs, permissions, limits, time, and credit estimate.
4. The user approves the plan.
5. Raincloud dispatches a cloud worker.
6. The user receives a push notification with the finished result or a blocker.

## First Audience

The initial audience is student builders, hackathon teams, indie developers, and phone-first technical users. The product should later expand to broader consumer tasks, especially jobs where a normal chat interface is insufficient because the work requires file processing, long runtime, external APIs, or real compute.

## MVP Task Lanes

- Code PRs: connect GitHub, approve a repo task, receive a branch/PR, summary, and check status.
- CSV cleanup and analysis: upload messy data, receive cleaned CSV, validation report, and charts or summaries.
- Video processing: upload a short clip, receive compressed, trimmed, converted, or captioned output.
- Audio and audiobook generation: upload a short text/PDF excerpt, choose voice preferences, receive an audio sample and metadata.
- Deep research packets: request a multi-source recommendation, receive a cited brief and exportable artifact.

## Foundation Docs

- [Product design spec](docs/superpowers/specs/2026-04-30-raincloud-design.md)
- [Architecture overview](docs/architecture.md)
- [Hackathon plan](docs/hackathon-plan.md)
- [MVP architecture decision](docs/decisions/0001-mobile-preflight-cloud-jobs.md)

## Development

Install dependencies:

```bash
npm install
```

Run scaffold checks:

```bash
npm test
```

Run TypeScript checks:

```bash
npm run typecheck
```

Start the Expo mobile app:

```bash
npm run start:mobile
```

## Repository Rules

This repo follows the workflow in [AGENTS.md](AGENTS.md):

- Never push directly to `main`.
- Always create a feature branch.
- Use `feature/<task-name>` or `fix/<issue>` branch names.
- Open a PR and wait for CI.
- Do not merge your own PRs.
