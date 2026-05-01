const DEFAULT_QUEUE_NAME = "approved-worker-runs";
const DEFAULT_MESSAGE_TTL_SECONDS = 604800;

export const serializeApprovedWorkerPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Approved worker payload must be an object");
  }

  if (!payload.runId || !payload.taskId || !payload.approvedPlanId) {
    throw new Error("Approved worker payload is missing runId, taskId, or approvedPlanId");
  }

  if (payload.approvedPlan?.status !== "approved") {
    throw new Error("Approved worker payload must contain an approved plan");
  }

  if (!payload.callback?.secretRef) {
    throw new Error("Approved worker payload must include callback.secretRef");
  }

  if (Object.hasOwn(payload.callback, "secret")) {
    throw new Error("Approved worker payload must not include a raw callback secret");
  }

  return JSON.stringify(payload);
};

export const createQueueClient = async ({
  storageAccountName,
  queueName = DEFAULT_QUEUE_NAME,
  credential,
}) => {
  if (!storageAccountName) {
    throw new Error("Missing AZURE_STORAGE_ACCOUNT_NAME for worker dispatch");
  }

  const [{ DefaultAzureCredential }, { QueueClient }] = await Promise.all([
    import("@azure/identity"),
    import("@azure/storage-queue"),
  ]);

  return new QueueClient(
    `https://${storageAccountName}.queue.core.windows.net/${queueName}`,
    credential ?? new DefaultAzureCredential(),
  );
};

export const enqueueApprovedWorkerRun = async ({
  payload,
  queueClient,
  storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME,
  queueName = process.env.AZURE_STORAGE_QUEUE_NAME ?? DEFAULT_QUEUE_NAME,
  credential,
  timeToLive = DEFAULT_MESSAGE_TTL_SECONDS,
}) => {
  const client =
    queueClient ??
    (await createQueueClient({
      storageAccountName,
      queueName,
      credential,
    }));

  const messageText = serializeApprovedWorkerPayload(payload);
  const response = await client.sendMessage(messageText, {
    messageTimeToLive: timeToLive,
  });

  return {
    messageId: response.messageId,
    response,
  };
};
