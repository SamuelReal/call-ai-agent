const callStore = new Map();

export function upsertCall(callId, payload) {
  const current = callStore.get(callId) || {};
  const next = { ...current, ...payload, updatedAt: new Date().toISOString() };
  callStore.set(callId, next);
  return next;
}

export function readCall(callId) {
  return callStore.get(callId) || null;
}

export function createOutboundJob(payload) {
  const jobId = `out_${Math.random().toString(36).slice(2, 10)}`;
  return {
    jobId,
    status: "queued",
    ...payload,
    createdAt: new Date().toISOString()
  };
}
