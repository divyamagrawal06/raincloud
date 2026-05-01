import type { Artifact, Task, TaskPlan } from '@raincloud/domain';

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    ownerId: 'user-1',
    title: 'Convert chapter-1.pdf to audiobook',
    prompt:
      'Convert my uploaded PDF to an audiobook with a calm, professional male narrator. Split by chapter.',
    status: 'succeeded',
    lane: 'audio_generation',
    activePlanId: 'plan-1',
    artifactIds: ['artifact-1', 'artifact-2'],
    createdAt: '2026-04-30T14:23:00Z',
    updatedAt: '2026-04-30T14:51:00Z',
  },
  {
    id: 'task-2',
    ownerId: 'user-1',
    title: 'Clean up customer_data.csv',
    prompt:
      'Remove duplicates, normalise phone numbers to E.164, fix UTF-8 encoding issues, add a validation report.',
    status: 'running',
    lane: 'csv_cleanup',
    activePlanId: 'plan-2',
    artifactIds: [],
    createdAt: '2026-05-01T09:10:00Z',
    updatedAt: '2026-05-01T09:14:00Z',
  },
  {
    id: 'task-3',
    ownerId: 'user-1',
    title: 'Add dark mode to dashboard',
    prompt:
      'Add a dark mode toggle to the React dashboard. Match the existing Tailwind CSS config. Open a PR.',
    status: 'plan_review',
    lane: 'code_pr',
    activePlanId: 'plan-3',
    artifactIds: [],
    createdAt: '2026-05-01T10:30:00Z',
    updatedAt: '2026-05-01T10:31:00Z',
  },
  {
    id: 'task-4',
    ownerId: 'user-1',
    title: 'Research best vector DBs for RAG',
    prompt:
      'Compare Pinecone, Weaviate, Chroma, and Qdrant for a production RAG system. 50 k docs, 10 k QPS target.',
    status: 'draft',
    lane: 'research_packet',
    artifactIds: [],
    createdAt: '2026-05-01T11:00:00Z',
    updatedAt: '2026-05-01T11:00:00Z',
  },
  {
    id: 'task-5',
    ownerId: 'user-1',
    title: 'Trim 45-min lecture to 8-min highlight',
    prompt: 'Cut dead air, filler words, and off-topic tangents. Keep key points and examples.',
    status: 'failed',
    lane: 'video_processing',
    activePlanId: 'plan-5',
    artifactIds: [],
    createdAt: '2026-04-29T18:00:00Z',
    updatedAt: '2026-04-29T18:22:00Z',
  },
];

export const MOCK_PLANS: Record<string, TaskPlan> = {
  'plan-1': {
    id: 'plan-1',
    taskId: 'task-1',
    status: 'approved',
    lane: 'audio_generation',
    goal: 'Generate a high-quality audiobook from chapter-1.pdf using a calm, professional male TTS voice, split into chapter tracks.',
    assumptions: [
      'PDF is text-based (not scanned)',
      'Chapter boundaries are marked with headings',
      'Target voice: ElevenLabs "Daniel" or equivalent',
    ],
    requiredInputs: ['chapter-1.pdf (uploaded)'],
    requiredPermissions: [],
    steps: [
      'Extract and clean text from PDF',
      'Detect chapter boundaries via heading heuristics',
      'Generate audio for each chapter via TTS API',
      'Stitch chapters, normalise loudness to -16 LUFS',
      'Produce MP3 + M4B output files',
    ],
    expectedArtifacts: [
      { kind: 'audio', name: 'chapter-1.mp3', description: 'Full audiobook as single MP3' },
      { kind: 'audio', name: 'chapter-1.m4b', description: 'Chaptered audiobook for Apple Books' },
    ],
    estimate: {
      creditMin: 8,
      creditMax: 14,
      runtimeSecondsMin: 90,
      runtimeSecondsMax: 240,
      limits: [{ key: 'max_chars', label: 'Max characters', value: '500 000' }],
    },
    risks: ['Scanned pages will fail text extraction'],
    createdAt: '2026-04-30T14:24:00Z',
    approvedAt: '2026-04-30T14:26:00Z',
  },
  'plan-3': {
    id: 'plan-3',
    taskId: 'task-3',
    status: 'proposed',
    lane: 'code_pr',
    goal: 'Add a dark mode toggle to the React dashboard, matching the existing Tailwind CSS v3 config.',
    assumptions: [
      'Dashboard uses Tailwind CSS v3 with tailwind.config.js at repo root',
      'Node.js ≥ 18 and npm are present',
      'Main branch is the target',
    ],
    requiredInputs: ['GitHub repository URL', 'Target branch (default: main)'],
    requiredPermissions: ['repo read', 'repo write (PR creation)'],
    steps: [
      'Clone repo and install dependencies',
      'Audit Tailwind config — add darkMode: "class" if absent',
      'Create ThemeToggle component with localStorage persistence',
      'Wrap layout with theme provider / class toggler',
      'Add dark: variants to all existing components',
      'Write unit tests for toggle behaviour',
      'Open PR with before/after screenshots',
    ],
    expectedArtifacts: [
      { kind: 'pull_request', name: 'feat/dark-mode', description: 'GitHub PR with all changes' },
    ],
    estimate: {
      creditMin: 12,
      creditMax: 20,
      runtimeSecondsMin: 180,
      runtimeSecondsMax: 420,
      limits: [
        { key: 'max_files', label: 'Max files changed', value: '30' },
        { key: 'max_tokens', label: 'Context window', value: '200 k' },
      ],
    },
    risks: [
      'Repo uses CSS Modules — Tailwind approach will differ',
      'Component count > 100 increases runtime past upper estimate',
    ],
    createdAt: '2026-05-01T10:31:00Z',
  },
};

export const MOCK_ARTIFACTS: Record<string, Artifact> = {
  'artifact-1': {
    id: 'artifact-1',
    taskId: 'task-1',
    kind: 'audio',
    name: 'chapter-1.mp3',
    description: 'Full audiobook, 38 min',
    mimeType: 'audio/mpeg',
    sizeBytes: 36_700_000,
    createdAt: '2026-04-30T14:51:00Z',
    expiresAt: '2026-05-07T14:51:00Z',
  },
  'artifact-2': {
    id: 'artifact-2',
    taskId: 'task-1',
    kind: 'audio',
    name: 'chapter-1.m4b',
    description: 'Chaptered for Apple Books',
    mimeType: 'audio/x-m4b',
    sizeBytes: 31_200_000,
    createdAt: '2026-04-30T14:51:00Z',
    expiresAt: '2026-05-07T14:51:00Z',
  },
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n-1',
    kind: 'task_succeeded' as const,
    title: 'Audiobook ready',
    body: '"Convert chapter-1.pdf to audiobook" finished. 2 files available.',
    taskId: 'task-1',
    createdAt: '2026-04-30T14:51:00Z',
    read: false,
  },
  {
    id: 'n-2',
    kind: 'plan_ready' as const,
    title: 'Plan ready for review',
    body: '"Add dark mode to dashboard" — 8 steps, 12–20 credits, ~4 min.',
    taskId: 'task-3',
    createdAt: '2026-05-01T10:31:00Z',
    read: false,
  },
  {
    id: 'n-3',
    kind: 'task_failed' as const,
    title: 'Task failed',
    body: '"Trim 45-min lecture" failed: video exceeds 2 GB limit.',
    taskId: 'task-5',
    createdAt: '2026-04-29T18:22:00Z',
    read: true,
  },
  {
    id: 'n-4',
    kind: 'task_running' as const,
    title: 'CSV cleanup started',
    body: '"Clean up customer_data.csv" is running. ETA ~3 min.',
    taskId: 'task-2',
    createdAt: '2026-05-01T09:14:00Z',
    read: true,
  },
];

/** Failure reasons for failed tasks, keyed by task ID. */
export const MOCK_FAILURE_REASONS: Record<string, string> = {
  'task-5': 'Video file exceeds the 2 GB size limit. Split into shorter segments and resubmit.',
};
