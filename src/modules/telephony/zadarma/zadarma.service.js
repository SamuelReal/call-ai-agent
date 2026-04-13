import { env } from "../../../config/env.js";
import { logger } from "../../../observability/logger.js";
import { setCallState } from "../../calls/call.service.js";
import { generateReplyText } from "../../ai/deepseek/deepseek.service.js";
import { createZadarmaApiSignature, isValidZadarmaSignature } from "./zadarma.security.js";

function normalizeEvent(payload) {
  return {
    event: payload?.event || payload?.event_name || payload?.type,
    callId: payload?.callId || payload?.call_id || payload?.pbx_call_id,
    direction: payload?.direction || payload?.call_direction,
    text: payload?.text || payload?.speech || payload?.transcript,
    outcome: payload?.outcome || payload?.status
  };
}

async function callZadarmaApi({ path, payload }) {
  const body = JSON.stringify(payload || {});
  const signature = createZadarmaApiSignature({ method: "POST", path, body });

  if (!signature) {
    logger.warn("Zadarma API credentials are missing; using simulation mode");
    return { ok: true, simulated: true };
  }

  const response = await fetch(`${env.ZADARMA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: signature.authorization,
      "x-client-nonce": signature.nonce
    },
    body
  });

  const responseText = await response.text();
  if (!response.ok) {
    logger.error({ status: response.status, body: responseText }, "Zadarma API request failed");
    return { ok: false, error: "zadarma_api_error", status: response.status };
  }

  return { ok: true, simulated: false, response: responseText };
}

export async function handleZadarmaEvent({ payload, headers, rawBody, correlationId }) {
  const signature = headers[env.ZADARMA_WEBHOOK_SIGNATURE_HEADER];
  const timestamp = headers[env.ZADARMA_WEBHOOK_TIMESTAMP_HEADER];

  const validSignature = isValidZadarmaSignature({
    payload,
    rawBody,
    signatureHeader: signature,
    timestampHeader: timestamp
  });

  if (!validSignature) {
    return { accepted: false, reason: "invalid_signature" };
  }

  const normalized = normalizeEvent(payload);
  const event = normalized.event;
  const callId = normalized.callId;
  if (!event || !callId) {
    return { accepted: false, reason: "invalid_payload" };
  }

  if (event === "call.started") {
    setCallState(callId, "GREETING", {
      direction: normalized.direction || "inbound",
      intent: "book_appointment",
      outcome: null,
      correlationId
    });
  }

  if (event === "speech.final") {
    const answer = await generateReplyText({
      transcript: normalized.text || "",
      context: { callId, intent: "book_appointment" }
    });

    setCallState(callId, "SLOT_COLLECTION", { lastBotReply: answer.text });

    logger.info({ callId, correlationId, answer: answer.text }, "Generated DeepSeek response");
  }

  if (event === "call.ended") {
    setCallState(callId, "ENDED", { outcome: normalized.outcome || "unknown" });
  }

  logger.info({ callId, correlationId, event }, "Zadarma event processed");
  return { accepted: true };
}

export async function createZadarmaOutbound({ phone, callId, campaign }) {
  const result = await callZadarmaApi({
    path: env.ZADARMA_OUTBOUND_PATH,
    payload: {
      destination: phone,
      client_call_id: callId,
      campaign
    }
  });

  logger.info({ phone, callId, campaign, simulated: result.simulated || false }, "Zadarma outbound dispatch");
  setCallState(callId, "INTENT_CAPTURE", { direction: "outbound", campaign });

  if (!result.ok) {
    setCallState(callId, "FAILED", { outcome: "telephony_error" });
  }

  return result;
}
