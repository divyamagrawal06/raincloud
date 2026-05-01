import { createHash } from "node:crypto";

export const DEFAULT_PDF_MERGE_MODEL = "gpt-5.4-mini";
export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const MAX_PDF_ATTACHMENTS = 7;

const plannerInstructions = `You are Hermes, Raincloud's PDF merge planning agent.

Return only structured JSON matching the schema. Do not dispatch work.

Your job:
- Decide whether the user's PDF merge request is ready for approval or needs clarification.
- Preserve the uploaded order unless the user asks to reorder files.
- Interpret natural-language reorder instructions such as "do Q3 report before Q2 report".
- Ask concise clarifying questions when the target order, included files, or output expectation is ambiguous.
- When ready, produce a plan_review with every attachment id exactly once in the merge order.
- Never invent attachment ids, callback secrets, blob keys, or cloud resource names.`;

const pdfMergePlannerSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "summary",
    "goal",
    "orderedAttachmentIds",
    "clarifyingQuestions",
    "assumptions",
    "steps",
    "expectedArtifactName",
    "risks",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["needs_input", "plan_review"],
    },
    summary: {
      type: "string",
    },
    goal: {
      type: "string",
    },
    orderedAttachmentIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
    clarifyingQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "prompt", "options"],
        properties: {
          id: {
            type: "string",
          },
          kind: {
            type: "string",
            enum: ["short_text", "single_select", "multi_select"],
          },
          prompt: {
            type: "string",
          },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "label", "description"],
              properties: {
                id: {
                  type: "string",
                },
                label: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    assumptions: {
      type: "array",
      items: {
        type: "string",
      },
    },
    steps: {
      type: "array",
      items: {
        type: "string",
      },
    },
    expectedArtifactName: {
      type: "string",
    },
    risks: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
};

const secretEnvironmentVariableNamePattern = /^[A-Z][A-Z0-9_]*_(SECRET|TOKEN|KEY)$/;

const createStableId = (prefix, value) => {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
};

const ensureNonEmptyString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
};

const toSafePdfFileName = (name) => {
  const safeName = `${name || "merged.pdf"}`
    .trim()
    .replaceAll("\\", "-")
    .replaceAll("/", "-");

  if (!safeName) {
    return "merged.pdf";
  }

  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
};

export const normalizePdfAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    throw new Error("PDF merge planning requires an attachments array");
  }

  const normalized = attachments.map((attachment, index) => {
    const id = attachment.id ?? attachment.attachmentId;
    const displayName = attachment.displayName ?? attachment.originalName;

    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`Attachment at index ${index} is missing an id`);
    }

    if (attachment.kind !== "pdf" || attachment.mimeType !== "application/pdf") {
      throw new Error(`Attachment ${displayName ?? id} is not a PDF`);
    }

    return {
      id,
      kind: "pdf",
      displayName: ensureNonEmptyString(displayName, `Attachment ${id} displayName`),
      originalName: attachment.originalName ?? displayName,
      mimeType: "application/pdf",
      sizeBytes: Number.isFinite(attachment.sizeBytes) ? attachment.sizeBytes : 0,
      blobKey: ensureNonEmptyString(attachment.blobKey, `Attachment ${id} blobKey`),
      uploadedOrder: Number.isFinite(attachment.uploadedOrder)
        ? attachment.uploadedOrder
        : index,
    };
  });

  if (normalized.length === 0) {
    throw new Error("PDF merge planning requires at least one PDF attachment");
  }

  if (normalized.length > MAX_PDF_ATTACHMENTS) {
    throw new Error(`PDF merge planning supports at most ${MAX_PDF_ATTACHMENTS} attachments`);
  }

  const ids = new Set();
  for (const attachment of normalized) {
    if (ids.has(attachment.id)) {
      throw new Error(`Duplicate attachment id: ${attachment.id}`);
    }
    ids.add(attachment.id);
  }

  return normalized.sort((left, right) => left.uploadedOrder - right.uploadedOrder);
};

const extractOpenAIResponseText = (body) => {
  if (typeof body?.output_text === "string") {
    return body.output_text;
  }

  const chunks = [];

  for (const outputItem of body?.output ?? []) {
    for (const contentItem of outputItem?.content ?? []) {
      if (typeof contentItem?.text === "string") {
        chunks.push(contentItem.text);
      }
    }
  }

  if (chunks.length > 0) {
    return chunks.join("");
  }

  throw new Error("OpenAI response did not include output text");
};

const parsePlannerJson = (body) => {
  const outputText = extractOpenAIResponseText(body);

  try {
    return JSON.parse(outputText);
  } catch (error) {
    throw new Error(
      `OpenAI planner response was not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const buildPlannerInput = ({ taskId, prompt, attachments, answers }) => ({
  taskId,
  prompt,
  answers: answers ?? {},
  attachments: attachments.map((attachment) => ({
    id: attachment.id,
    displayName: attachment.displayName,
    uploadedOrder: attachment.uploadedOrder,
    mimeType: attachment.mimeType,
  })),
  rules: {
    maxPdfAttachments: MAX_PDF_ATTACHMENTS,
    defaultOrder: attachments.map((attachment) => attachment.id),
    approvalRequiredBeforeDispatch: true,
  },
});

const requestPlannerJson = async ({
  taskId,
  prompt,
  attachments,
  answers,
  model,
  openaiApiKey,
  fetchImpl,
}) => {
  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: plannerInstructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                buildPlannerInput({ taskId, prompt, attachments, answers }),
              ),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "raincloud_pdf_merge_planner",
          strict: true,
          schema: pdfMergePlannerSchema,
        },
      },
      max_output_tokens: 2200,
    }),
  });

  if (!response.ok) {
    const errorText =
      typeof response.text === "function" ? await response.text() : response.statusText;
    throw new Error(
      `OpenAI planner request failed with ${response.status} ${errorText}`.trim(),
    );
  }

  return parsePlannerJson(await response.json());
};

const normalizeClarifyingQuestions = ({ taskId, plannerJson }) =>
  plannerJson.clarifyingQuestions.map((question, index) => ({
    id: question.id || `question_${index + 1}`,
    taskId,
    kind: question.kind,
    prompt: ensureNonEmptyString(question.prompt, "Clarifying question prompt"),
    required: true,
    options:
      question.kind === "short_text"
        ? undefined
        : question.options.map((option) => ({
            id: ensureNonEmptyString(option.id, "Clarifying option id"),
            label: ensureNonEmptyString(option.label, "Clarifying option label"),
            description: option.description || undefined,
          })),
  }));

const assertPlannerJsonShape = (plannerJson) => {
  if (!plannerJson || typeof plannerJson !== "object") {
    throw new Error("Planner output must be an object");
  }

  if (!["needs_input", "plan_review"].includes(plannerJson.status)) {
    throw new Error("Planner output status must be needs_input or plan_review");
  }

  if (!Array.isArray(plannerJson.orderedAttachmentIds)) {
    throw new Error("Planner output orderedAttachmentIds must be an array");
  }

  if (!Array.isArray(plannerJson.clarifyingQuestions)) {
    throw new Error("Planner output clarifyingQuestions must be an array");
  }
};

const assertCompleteAttachmentOrder = ({ orderedAttachmentIds, attachments }) => {
  const availableIds = new Set(attachments.map((attachment) => attachment.id));
  const seenIds = new Set();

  for (const attachmentId of orderedAttachmentIds) {
    if (!availableIds.has(attachmentId)) {
      throw new Error(`Planner returned unknown attachment id: ${attachmentId}`);
    }

    if (seenIds.has(attachmentId)) {
      throw new Error(`Planner returned duplicate attachment id: ${attachmentId}`);
    }

    seenIds.add(attachmentId);
  }

  if (seenIds.size !== attachments.length) {
    throw new Error("Planner must include every attachment exactly once");
  }
};

const createPlan = ({ taskId, prompt, attachments, plannerJson, now }) => {
  assertCompleteAttachmentOrder({
    orderedAttachmentIds: plannerJson.orderedAttachmentIds,
    attachments,
  });

  const planId = createStableId(
    "plan",
    JSON.stringify({
      taskId,
      prompt,
      orderedAttachmentIds: plannerJson.orderedAttachmentIds,
      expectedArtifactName: plannerJson.expectedArtifactName,
    }),
  );

  const attachmentCount = attachments.length;

  return {
    id: planId,
    taskId,
    status: "proposed",
    lane: "pdf_merge",
    goal:
    goal: ensureNonEmptyString(plannerJson.goal, "Planner goal"),
    assumptions: plannerJson.assumptions,
    requiredInputs: [`${attachmentCount} uploaded PDF attachment${attachmentCount === 1 ? "" : "s"}`],
    requiredPermissions: [
      "Read scoped input PDF blobs",
      "Write one merged PDF artifact",
    ],
    steps:
      plannerJson.steps.length > 0
        ? plannerJson.steps
        : [
            "Validate each scoped input is a readable PDF.",
            "Merge the PDFs in the approved order.",
            "Upload the merged PDF artifact.",
          ],
    expectedArtifacts: [
      {
        kind: "pdf",
        name: toSafePdfFileName(plannerJson.expectedArtifactName),
        description: plannerJson.summary || "One merged PDF in the approved order.",
      },
    ],
    estimate: {
      creditMin: 1,
      creditMax: attachmentCount > 4 ? 2 : 1,
      runtimeSecondsMin: 10,
      runtimeSecondsMax: 300,
      externalSpendUsdMax: 0.05,
      limits: [
        {
          key: "max_input_files",
          label: "Maximum input PDFs",
          value: String(MAX_PDF_ATTACHMENTS),
        },
        {
          key: "max_runtime_seconds",
          label: "Maximum worker runtime",
          value: "300",
        },
      ],
    },
    risks:
      plannerJson.risks.length > 0
        ? plannerJson.risks
        : ["Corrupt, encrypted, or non-PDF inputs may fail during merge."],
    createdAt: now().toISOString(),
  };
};

export const createPdfMergePlan = async ({
  taskId,
  prompt,
  attachments,
  answers,
  openaiApiKey = process.env.OPENAI_API_KEY,
  model = process.env.RAINCLOUD_OPENAI_MODEL ?? DEFAULT_PDF_MERGE_MODEL,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
}) => {
  const normalizedTaskId = ensureNonEmptyString(taskId, "taskId");
  const normalizedPrompt = ensureNonEmptyString(prompt, "prompt");
  const normalizedAttachments = normalizePdfAttachments(attachments);

  if (!openaiApiKey) {
    throw new Error("Missing OPENAI_API_KEY for PDF merge planning");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required for PDF merge planning");
  }

  const plannerJson = await requestPlannerJson({
    taskId: normalizedTaskId,
    prompt: normalizedPrompt,
    attachments: normalizedAttachments,
    answers,
    model,
    openaiApiKey,
    fetchImpl,
  });

  assertPlannerJsonShape(plannerJson);

  if (plannerJson.status === "needs_input") {
    const clarifyingQuestions = normalizeClarifyingQuestions({
      taskId: normalizedTaskId,
      plannerJson,
    });

    if (clarifyingQuestions.length === 0) {
      throw new Error("Planner returned needs_input without a clarifying question");
    }

    return {
      status: "needs_input",
      taskId: normalizedTaskId,
      lane: "pdf_merge",
      model,
      summary: plannerJson.summary,
      clarifyingQuestions,
      orderedAttachments: [],
    };
  }

  const plan = createPlan({
    taskId: normalizedTaskId,
    prompt: normalizedPrompt,
    attachments: normalizedAttachments,
    plannerJson,
    now,
  });
  const attachmentById = new Map(
    normalizedAttachments.map((attachment) => [attachment.id, attachment]),
  );

  return {
    status: "plan_review",
    taskId: normalizedTaskId,
    lane: "pdf_merge",
    model,
    summary: plannerJson.summary,
    plan,
    clarifyingQuestions: [],
    orderedAttachments: plannerJson.orderedAttachmentIds.map((attachmentId) =>
      attachmentById.get(attachmentId),
    ),
  };
};

const assertCallbackSecretRef = (secretRef) => {
  if (!secretEnvironmentVariableNamePattern.test(secretRef)) {
    throw new Error("callbackSecretRef must be an environment variable ending in SECRET, TOKEN, or KEY");
  }
};

export const createApprovedPdfMergeWorkerPayload = ({
  planningResult,
  runId,
  callbackUrl,
  callbackSecretRef,
  artifactContainer = "outputs",
  artifactPrefix,
  now = () => new Date(),
}) => {
  if (planningResult?.status !== "plan_review" || !planningResult.plan) {
    throw new Error("Only a reviewed PDF merge plan can be approved");
  }

  const normalizedRunId =
    runId ??
    createStableId(
      "run",
      JSON.stringify({
        taskId: planningResult.taskId,
        planId: planningResult.plan.id,
      }),
    );
  const normalizedCallbackUrl = ensureNonEmptyString(callbackUrl, "callbackUrl");
  const normalizedSecretRef = ensureNonEmptyString(
    callbackSecretRef,
    "callbackSecretRef",
  );
  assertCallbackSecretRef(normalizedSecretRef);

  const normalizedArtifactPrefix =
    artifactPrefix ??
    `outputs/${planningResult.taskId}/${normalizedRunId}/`;

  if (normalizedArtifactPrefix.includes("..") || normalizedArtifactPrefix.startsWith("/")) {
    throw new Error("artifactPrefix must be a scoped relative prefix");
  }

  const approvedAt = now().toISOString();
  const approvedPlan = {
    ...planningResult.plan,
    status: "approved",
    approvedAt,
  };

  return {
    runId: normalizedRunId,
    taskId: planningResult.taskId,
    approvedPlanId: planningResult.plan.id,
    approvedPlan,
    inputs: planningResult.orderedAttachments.map((attachment) => ({
      attachmentId: attachment.id,
      kind: "pdf",
      blobKey: attachment.blobKey,
      displayName: attachment.displayName,
      mimeType: "application/pdf",
    })),
    artifactDestination: {
      container: ensureNonEmptyString(artifactContainer, "artifactContainer"),
      prefix: normalizedArtifactPrefix,
    },
    callback: {
      url: normalizedCallbackUrl,
      secretRef: normalizedSecretRef,
    },
  };
};
