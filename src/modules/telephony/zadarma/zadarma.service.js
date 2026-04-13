import { env } from "../../../config/env.js";
import { logger } from "../../../observability/logger.js";
import { setCallState } from "../../calls/call.service.js";
import { generateReplyText } from "../../ai/deepseek/deepseek.service.js";
import { isValidZadarmaSignature } from "./zadarma.security.js";

export async function handleZadarmaEvent({ payload, headers, correlationId }) {
  const signature = headers[env.ZADARMA_WEBHOOK_SIGNATURE_HEADER];

  if (!isValidZadarmaSignature(payload, signature)) {
    return { accepted: false, reason: "invalid_signature" };
  }

  const event = payload?.event;
  const callId = payload?.callId;
  if (!event || !callId) {
    return { accepted: false, reason: "invalid_payload" };
  }

  if (event === "call.started") {
    setCallState(callId, "GREETING", {
      direction: payload.direction || "inbound",
      intent: "book_appointment",
      outcome: null,
      correlationId
    });
  }

  if (event === "speech.final") {
    const answer = await generateReplyText({
      transcript: payload.text || "",
      context: { callId, intent: "book_appointment" }
    });

    setCallState(callId, "SLOT_COLLECTION", { lastBotReply: answer.text });

    logger.info({ callId, correlationId, answer: answer.text }, "Generated DeepSeek response");
  }

  if (event === "call.ended") {
    setCallState(callId, "ENDED", { outcome: payload.outcome || "unknown" });
  }

  logger.info({ callId, correlationId, event }, "Zadarma event processed");
  return { accepted: true };
}

export function createZadarmaOutbound({ phone, callId, campaign }) {
  logger.info({ phone, callId, campaign }, "Simulated Zadarma outbound dispatch");
  setCallState(callId, "INTENT_CAPTURE", { direction: "outbound", campaign });
}
