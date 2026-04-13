import { createOutboundJob, readCall, upsertCall } from "./call.store.js";
import { createZadarmaOutbound } from "../telephony/zadarma/zadarma.service.js";

export async function enqueueOutboundCall(payload, correlationId) {
  const job = createOutboundJob(payload);

  upsertCall(job.jobId, {
    callId: job.jobId,
    state: "INIT",
    direction: "outbound",
    intent: "book_appointment",
    outcome: null,
    correlationId
  });

  const outboundResult = await createZadarmaOutbound({
    phone: payload.phone,
    callId: job.jobId,
    campaign: payload.campaign
  });

  return {
    jobId: job.jobId,
    status: outboundResult.ok ? job.status : "failed",
    simulated: outboundResult.simulated || false
  };
}

export function getCallStatus(callId) {
  return readCall(callId);
}

export function setCallState(callId, state, patch = {}) {
  return upsertCall(callId, { callId, state, ...patch });
}
