# Raincloud Hackathon Plan

Date: 2026-04-30
Status: Build plan for hackathon MVP

## Objective

Build a convincing Raincloud demo that proves the product is more than a hosted agent or Telegram bot. The demo should show a user submitting a task from a phone, Raincloud clarifying the request, presenting a plan, waiting for approval, running the cloud job, and returning a real artifact.

## Core Hackathon Claim

Raincloud is the mobile preflight and dispatch layer for cloud tasks.

It turns vague phone prompts into safe, priced, approved execution plans, then runs the right cloud worker or external API and returns a finished artifact.

## Recommended Demo Set

### Demo 1: Book To Audiobook Sample

Why this is the hero demo:

- It is easy to understand.
- It is more compute-like than a chat answer.
- It produces a concrete artifact.
- It shows why a phone-only user wants cloud execution.
- It benefits from clarifying questions and cost caps.

Flow:

1. User uploads a short PDF or text excerpt.
2. User asks: "Turn this into an audiobook sample with a warm narrator voice."
3. Raincloud asks for voice style and output format if needed.
4. Raincloud shows plan, time estimate, credit estimate, and generated audio minute cap.
5. User taps "Approve & Run."
6. Worker generates audio sample.
7. User receives push notification.
8. User opens audio artifact and metadata.

### Demo 2: GitHub PR From Phone

Why this matters:

- It keeps the student-builder audience anchored.
- It shows Raincloud can do developer tasks without a laptop.
- It creates a high-trust artifact: a PR.

Flow:

1. User connects GitHub.
2. User selects a sample repo.
3. User asks: "Add dark mode to this app."
4. Raincloud clarifies scope if needed.
5. Raincloud shows plan and permissions.
6. User approves.
7. Worker creates branch and PR.
8. User receives PR link and summary.

### Demo 3: CSV Cleanup

Why this is useful:

- It is concrete.
- It can be demoed with a small file.
- It shows a broad non-code task.

Flow:

1. User uploads messy CSV.
2. User asks for normalization, dedupe, and invalid-row detection.
3. Raincloud plans the transformation.
4. User approves.
5. Worker returns cleaned CSV and report.

## MVP Milestones

### Milestone 1: Product Shell

- Mobile task composer.
- Task list.
- Task detail.
- Static examples.
- Attachment entry point.

### Milestone 2: Plan Mode

- Task classification.
- Clarifying question loop.
- Plan generation.
- Plan approval.
- Plan revision before approval.

### Milestone 3: Async Job Loop

- Queue approved task.
- Start one cloud worker.
- Write milestones.
- Return artifact.
- Notify user.

### Milestone 4: Hero Pipeline

- Implement book-to-audiobook sample path.
- Enforce short excerpt and generated-minute caps.
- Return audio artifact and metadata.

### Milestone 5: Developer Pipeline

- Connect GitHub for selected repo access.
- Clone or fetch repo in worker.
- Make small change.
- Open PR.
- Return PR summary.

### Milestone 6: Data Pipeline

- Upload CSV.
- Clean and validate.
- Return cleaned CSV and report.

## Acceptance Checklist

- A vague prompt causes Raincloud to ask at least one useful clarifying question.
- A task cannot run until the user approves a plan.
- The plan shows expected output, estimated time, estimated credits, and limits.
- The phone can be locked while the job runs.
- A push notification or visible completion state appears after the job finishes.
- The result is an artifact, PR, or report.
- A failed job returns a useful failure explanation.

## Pitch Narrative

The problem:

> Billions of people live on their phones, but serious AI agent workflows still assume a laptop, terminal, IDE, or always-on computer.

The insight:

> Hosted agents and chat bots are no longer enough. The missing layer is a mobile-native planning and dispatch experience that makes cloud compute safe, bounded, and useful from a phone.

The product:

> Raincloud asks the questions a good operator would ask, shows the plan before spending compute, runs the job in the cloud, and gives you the finished artifact.

The demo:

> We turn a phone prompt into an approved cloud job and return an audiobook sample, a GitHub PR, or a cleaned dataset.

## Non-Goals During Hackathon

- Production billing.
- Full persistent workspaces.
- Enterprise permissions.
- Full-scale book conversion.
- Long video processing.
- Multi-cloud orchestration.
- Complex model-routing marketplace.
- Native mobile code outside Expo unless absolutely necessary.

## Success Bar

The hackathon project succeeds if a judge understands within two minutes that Raincloud is not "Telegram plus agent." It is a phone-native control plane for planning, approving, running, and receiving cloud tasks.
