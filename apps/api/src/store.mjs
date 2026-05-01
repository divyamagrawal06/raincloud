// In-memory control-plane store for Raincloud.
// TODO: replace all storage with Supabase when the database is ready.

// tasks
const tasks = new Map();

// attachments
const attachments = new Map();
const attachmentsByTask = new Map(); // taskId -> attachmentId[]

// plans (TaskPlan + API-internal orderedAttachmentIds field)
const plans = new Map();
const plansByTask = new Map(); // taskId -> planId[]

// runs
const runs = new Map();
const runByTask = new Map(); // taskId -> runId (most recent)

// artifacts
const artifacts = new Map();
const artifactsByTask = new Map(); // taskId -> artifactId[]

// idempotency for worker events
// TODO: this Set is never pruned — entries accumulate for the lifetime of the process.
// When migrating to Supabase, use a table with a TTL or a periodic cleanup job instead.
const processedEvents = new Set(); // "${runId}:${eventId}"

// ---- tasks ----

export const saveTask = (task) => {
  // TODO: replace with Supabase
  tasks.set(task.id, { ...task });
};

export const getTask = (taskId) => {
  // TODO: replace with Supabase
  return tasks.get(taskId) ?? null;
};

export const updateTaskStatus = (taskId, status, patch = {}) => {
  // TODO: replace with Supabase
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const updated = {
    ...task,
    ...patch,
    status,
    updatedAt: new Date().toISOString(),
  };
  tasks.set(taskId, updated);
  return updated;
};

// ---- attachments ----

export const saveAttachment = (attachment) => {
  // TODO: replace with Supabase
  attachments.set(attachment.id, { ...attachment });
  const list = attachmentsByTask.get(attachment.taskId) ?? [];
  if (!list.includes(attachment.id)) {
    list.push(attachment.id);
    attachmentsByTask.set(attachment.taskId, list);
  }
};

export const getAttachmentsForTask = (taskId) => {
  // TODO: replace with Supabase
  const ids = attachmentsByTask.get(taskId) ?? [];
  return ids
    .map((id) => attachments.get(id))
    .filter(Boolean)
    .sort((a, b) => a.uploadedOrder - b.uploadedOrder);
};

// ---- plans ----

export const savePlan = (planRecord) => {
  // TODO: replace with Supabase
  // planRecord extends TaskPlan with an internal orderedAttachmentIds: string[] field
  plans.set(planRecord.id, { ...planRecord });
  const list = plansByTask.get(planRecord.taskId) ?? [];
  if (!list.includes(planRecord.id)) {
    list.push(planRecord.id);
    plansByTask.set(planRecord.taskId, list);
  }
};

export const getPlan = (planId) => {
  // TODO: replace with Supabase
  return plans.get(planId) ?? null;
};

export const supersedePriorPlans = (taskId, exceptPlanId) => {
  // TODO: replace with Supabase
  const ids = plansByTask.get(taskId) ?? [];
  for (const id of ids) {
    if (id !== exceptPlanId) {
      const plan = plans.get(id);
      if (plan?.status === "proposed") {
        plans.set(id, { ...plan, status: "superseded" });
      }
    }
  }
};

// ---- runs ----

export const saveRun = (run) => {
  // TODO: replace with Supabase
  runs.set(run.id, { ...run });
  runByTask.set(run.taskId, run.id);
};

export const getRun = (runId) => {
  // TODO: replace with Supabase
  return runs.get(runId) ?? null;
};

export const getRunForTask = (taskId) => {
  // TODO: replace with Supabase
  const runId = runByTask.get(taskId);
  return runId ? (runs.get(runId) ?? null) : null;
};

export const updateRunStatus = (runId, status, patch = {}) => {
  // TODO: replace with Supabase
  const run = runs.get(runId);
  if (!run) throw new Error(`Run not found: ${runId}`);
  const updated = { ...run, ...patch, status };
  runs.set(runId, updated);
  return updated;
};

// ---- artifacts ----

export const saveArtifact = (artifact) => {
  // TODO: replace with Supabase
  artifacts.set(artifact.id, { ...artifact });
  const list = artifactsByTask.get(artifact.taskId) ?? [];
  if (!list.includes(artifact.id)) {
    list.push(artifact.id);
    artifactsByTask.set(artifact.taskId, list);
  }
};

export const getArtifact = (artifactId) => {
  // TODO: replace with Supabase
  return artifacts.get(artifactId) ?? null;
};

export const getArtifactsForTask = (taskId) => {
  // TODO: replace with Supabase
  const ids = artifactsByTask.get(taskId) ?? [];
  return ids.map((id) => artifacts.get(id)).filter(Boolean);
};

// ---- idempotency ----

export const isEventProcessed = (runId, eventId) => {
  // TODO: replace with Supabase
  return processedEvents.has(`${runId}:${eventId}`);
};

export const markEventProcessed = (runId, eventId) => {
  // TODO: replace with Supabase
  processedEvents.add(`${runId}:${eventId}`);
};
