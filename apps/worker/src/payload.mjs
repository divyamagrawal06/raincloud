export const parseQueueMessageText = (messageText) => {
  const candidates = [
    messageText,
    Buffer.from(messageText, "base64").toString("utf8"),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next queue encoding candidate.
    }
  }

  throw new Error("Queue message does not contain valid JSON");
};

export const resolveBlobKey = (blobKey) => {
  if (
    typeof blobKey !== "string" ||
    blobKey.length === 0 ||
    blobKey.startsWith("/") ||
    blobKey.includes("..") ||
    blobKey.includes("\\")
  ) {
    throw new Error(`Invalid blob key: ${blobKey}`);
  }

  const [container, ...blobNameParts] = blobKey.split("/");
  const blobName = blobNameParts.join("/");

  if (!container || !blobName) {
    throw new Error(`Invalid blob key: ${blobKey}`);
  }

  return { container, blobName };
};

const sanitizeArtifactName = (name) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    return "merged.pdf";
  }

  return name.trim().replaceAll("\\", "-").replaceAll("/", "-");
};

export const resolveOutputBlobName = (payload) => {
  const expectedArtifactName =
    payload.approvedPlan?.expectedArtifacts?.[0]?.name ?? "merged.pdf";
  const normalizedPrefix = `${payload.artifactDestination.prefix ?? ""}`
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/\/?$/, "/");

  if (normalizedPrefix.includes("..")) {
    throw new Error("Invalid artifact destination prefix");
  }

  return `${normalizedPrefix}${sanitizeArtifactName(expectedArtifactName)}`;
};

export const validateWorkerPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Worker payload must be an object");
  }

  for (const key of ["runId", "taskId", "approvedPlanId"]) {
    if (typeof payload[key] !== "string" || payload[key].length === 0) {
      throw new Error(`Worker payload is missing ${key}`);
    }
  }

  if (payload.approvedPlan?.status !== "approved") {
    throw new Error("Worker payload must contain an approved plan");
  }

  if (payload.approvedPlan?.lane !== "pdf_merge") {
    throw new Error("MVP worker only supports pdf_merge plans");
  }

  if (!Array.isArray(payload.inputs) || payload.inputs.length === 0) {
    throw new Error("PDF merge payload requires at least one input");
  }

  if (payload.inputs.length > 7) {
    throw new Error("PDF merge payload cannot include more than 7 inputs");
  }

  for (const input of payload.inputs) {
    if (input.kind !== "pdf" || input.mimeType !== "application/pdf") {
      throw new Error(`Unsupported input: ${input.displayName ?? input.attachmentId}`);
    }

    resolveBlobKey(input.blobKey);
  }

  if (!payload.artifactDestination?.container) {
    throw new Error("Worker payload is missing artifact destination container");
  }

  resolveOutputBlobName(payload);

  if (payload.callback && Object.hasOwn(payload.callback, "secret")) {
    throw new Error("Worker payload must not include a raw callback secret");
  }

  return payload;
};
