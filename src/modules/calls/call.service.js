import { createOutboundJob, readCall, upsertCall } from "./call.store.js";
import { createZadarmaOutbound } from "../telephony/zadarma/zadarma.service.js";

export function enqueueOutboundCall(payload, correlationId) {
  const job = createOutboundJob(payload);

  upsertCall(job.jobId, {
    callId: job.jobId,
    state: "INIT",
    direction: "outbound",
    intent: "book_appointment",
    outcome: null,
    correlationId
  });

  createZadarmaOutbound({
    phone: payload.phone,
    callId: job.jobId,
    campaign: payload.campaign
  });

  return { jobId: job.jobId, status: job.status };
}

export function getCallStatus(callId) {
  return readCall(callId);
}

export function setCallState(callId, state, patch = {}) {
  return upsertCall(callId, { callId, state, ...patch });
}
