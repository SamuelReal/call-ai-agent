import { env } from "../../config/env.js";
import { createOutboundJob, readCall, upsertCall } from "./call.store.js";
import { mysqlReadCall, mysqlUpsertCall } from "./call.mysql.js";
import { createZadarmaOutbound } from "../telephony/zadarma/zadarma.service.js";

function useMysql() {
  return env.STORAGE_PROVIDER === "mysql";
}

export async function enqueueOutboundCall(payload, correlationId) {
  const job = createOutboundJob(payload);

  await setCallState(job.jobId, "INIT", {
    callId: job.jobId,
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

export async function getCallStatus(callId) {
  if (useMysql()) {
    return mysqlReadCall(callId);
  }
  return readCall(callId);
}

export async function setCallState(callId, state, patch = {}) {
  const payload = { callId, state, ...patch };
  if (useMysql()) {
    return mysqlUpsertCall(callId, payload);
  }
  return upsertCall(callId, payload);
}
