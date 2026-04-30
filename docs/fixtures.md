# Task Fixtures

Date: 2026-04-30
Status: Initial fixture set

Raincloud task fixtures live in `fixtures/tasks/`. They provide realistic, stable examples for the mobile task list, plan review screen, run detail screen, result views, and future worker contract tests.

These fixtures are not generated outputs from a real worker. They are hand-authored examples that model the product contract from the architecture docs: a user prompt becomes clarifying questions, an approved immutable plan, a finite worker run, and one or more artifacts.

## Fixture Files

| File | Lane | Demo purpose |
| --- | --- | --- |
| `fixtures/tasks/audiobook-sample.json` | `audio_audiobook_generation` | Hero demo for turning a PDF/text excerpt into an MP3 audiobook sample. |
| `fixtures/tasks/csv-cleanup.json` | `csv_cleanup_analysis` | Data demo for cleaning, deduping, validating, and reporting on a messy CSV. |
| `fixtures/tasks/video-processing.json` | `video_processing` | Media demo for compressing a phone video and returning captions. |
| `fixtures/tasks/code-pr.json` | `code_pr` | Developer demo for creating a branch, running checks, and opening a GitHub PR. |
| `fixtures/tasks/research-packet.json` | `deep_research_packet` | Research demo for returning a cited recommendation and Markdown artifact. |

## Shared Shape

Each fixture uses the same top-level sections:

- `schemaVersion`: Fixture schema version. Start at `1` until a breaking format change is needed.
- `id`, `title`, `lane`, `status`, `createdAt`: Stable task identity and display metadata.
- `prompt`: The original mobile request, selected repo when relevant, and uploaded attachments.
- `clarifyingQuestions`: Questions Raincloud asked before planning, with the accepted answer and why it mattered.
- `approvedPlan`: The exact plan the user approved before compute started.
- `workerRun`: A finite run record with timestamps and user-visible milestones.
- `result`: The final summary, artifacts, usage, metrics or recommendation details, and suggested follow-ups.

The `approvedPlan` section intentionally mirrors the planning contract from `docs/architecture.md`:

- clarified goal
- inputs
- permissions
- recipe or runtime
- execution steps
- expected outputs
- runtime and credit estimates
- external API usage
- limits
- assumptions
- risks
- approval state

## Authoring Rules

- Keep fixtures deterministic. Do not include live signed URLs, secrets, random IDs, or current timestamps.
- Prefer small, believable numbers over huge demo claims.
- Include at least one clarifying question when the answer changes execution.
- Keep artifact metadata realistic enough for UI states: `kind`, `name`, `mimeType`, `sizeBytes`, and `retentionDays`.
- Keep code PR examples scoped to a selected repository and narrow permission set.
- Keep media examples inside documented MVP caps.
- Use `status` values from the product lifecycle where possible: `draft`, `clarifying`, `plan_review`, `queued`, `planning`, `running`, `needs_input`, `succeeded`, `failed`, or `canceled`.

## Suggested Usage

Mobile UI code can load these files as seed data for static screens before the API exists. Future tests can also use them as contract examples for plan rendering and result rendering.

When wiring the app, prefer treating each fixture as a complete task detail response. A list view can derive compact cards from `title`, `lane`, `status`, `createdAt`, `result.summary`, and the first artifact. Detail views should render `clarifyingQuestions`, `approvedPlan`, `workerRun.milestones`, and `result.artifacts`.

## Adding More Fixtures

Add new fixture files under `fixtures/tasks/` with a descriptive kebab-case name. Update the table above in the same change. If a new lane needs fields that do not fit the shared shape, document the field here and keep the existing sections intact so UI and test code can continue to rely on them.
