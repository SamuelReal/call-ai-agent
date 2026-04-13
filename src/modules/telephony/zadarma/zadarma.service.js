import { env } from "../../../config/env.js";
import { logger } from "../../../observability/logger.js";
import { getCallStatus, setCallState } from "../../calls/call.service.js";
import { generateReplyText } from "../../ai/deepseek/deepseek.service.js";
import { checkAvailability, createAppointment } from "../../appointments/appointment.service.js";
import { ensureCustomerByPhone, setCustomerNameByPhone } from "../../customers/customer.service.js";
import { createZadarmaApiSignature, isValidZadarmaSignature } from "./zadarma.security.js";
import { buildWebhookEventKey, registerWebhookEvent } from "./zadarma.idempotency.js";

function normalizeEvent(payload) {
  return {
    event: payload?.event || payload?.event_name || payload?.type,
    callId: payload?.callId || payload?.call_id || payload?.pbx_call_id,
    direction: payload?.direction || payload?.call_direction,
    from: payload?.from || payload?.caller_id || payload?.phone,
    text: payload?.text || payload?.speech || payload?.transcript,
    outcome: payload?.outcome || payload?.status
  };
}

function pickSlotFromTranscript(transcript, slots) {
  const text = String(transcript || "").toLowerCase();

  if ((text.includes("09:30") || text.includes("9:30") || text.includes("nueve y media")) && slots[0]) {
    return slots.find((slot) => slot.includes("T09:30")) || null;
  }

  if ((text.includes("11:00") || text.includes("11") || text.includes("once")) && slots[0]) {
    return slots.find((slot) => slot.includes("T11:00")) || null;
  }

  if ((text.includes("16:00") || text.includes("16") || text.includes("cuatro de la tarde")) && slots[0]) {
    return slots.find((slot) => slot.includes("T16:00")) || null;
  }

  return null;
}

function extractNameFromTranscript(transcript) {
  const text = String(transcript || "").trim();
  if (!text) {
    return "";
  }

  const patterns = [
    /(?:me llamo|mi nombre es|soy)\s+([a-zA-Z\s]{2,40})/i,
    /(?:nombre)\s*[:\-]?\s*([a-zA-Z\s]{2,40})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return "";
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

  const eventKey = buildWebhookEventKey({ payload, rawBody, signature, timestamp });
  const shouldProcess = await registerWebhookEvent({
    eventKey,
    provider: "zadarma",
    event,
    callId,
    payload
  });

  if (!shouldProcess) {
    logger.info({ callId, correlationId, event, eventKey }, "Duplicate Zadarma webhook ignored");
    return { accepted: true, duplicate: true };
  }

  if (event === "call.started") {
    const customer = await ensureCustomerByPhone(normalized.from || "unknown");
    const hasName = Boolean(customer?.name);

    await setCallState(callId, "GREETING", {
      direction: normalized.direction || "inbound",
      intent: "book_appointment",
      outcome: null,
      correlationId,
      customerPhone: customer?.phone || normalized.from || "unknown",
      customerId: customer?.customerId || null,
      customerName: customer?.name || "",
      awaitingCustomerName: !hasName,
      lastBotReply: hasName
        ? `Hola ${customer.name}, te ayudo a agendar tu cita.`
        : "Hola, para continuar necesito tu nombre completo."
    });
  }

  if (event === "speech.final") {
    const currentCall = (await getCallStatus(callId)) || {};
    const transcript = normalized.text || "";
    const currentPhone = currentCall.customerPhone || normalized.from || "unknown";
    const currentName = currentCall.customerName || "";

    if (!currentName) {
      const extractedName = extractNameFromTranscript(transcript);
      if (!extractedName) {
        await setCallState(callId, "CUSTOMER_NAME_REQUIRED", {
          customerPhone: currentPhone,
          customerName: "",
          awaitingCustomerName: true,
          lastBotReply: "Para poder reservar, por favor dime tu nombre completo."
        });
        logger.info({ callId, correlationId, event }, "Customer name requested");
        return { accepted: true };
      }

      const updatedCustomer = await setCustomerNameByPhone(currentPhone, extractedName);
      await setCallState(callId, "SLOT_COLLECTION", {
        customerPhone: currentPhone,
        customerId: updatedCustomer?.customerId || currentCall.customerId || null,
        customerName: updatedCustomer?.name || extractedName,
        awaitingCustomerName: false,
        lastBotReply: `Gracias ${updatedCustomer?.name || extractedName}. Ahora dime que horario prefieres: 09:30, 11:00 o 16:00.`
      });
      logger.info({ callId, correlationId, customerName: updatedCustomer?.name || extractedName }, "Customer name captured");
      return { accepted: true };
    }

    const availableSlots = await checkAvailability({ timezone: env.DEFAULT_TIMEZONE });
    const selectedSlot = pickSlotFromTranscript(transcript, availableSlots);

    if (selectedSlot) {
      const appointment = await createAppointment({
        name: currentName,
        phone: currentPhone,
        slot: selectedSlot,
        source: "voice_bot"
      });

      if (appointment) {
        await setCallState(callId, "BOOKING", {
          outcome: "booked_pending_end",
          appointmentId: appointment.appointmentId,
          selectedSlot,
          lastBotReply: `Perfecto, he reservado tu cita para ${selectedSlot}. Tu codigo es ${appointment.appointmentId}.`,
          aiProvider: "rule-engine",
          aiModel: "slot-parser-v1",
          aiFallback: false,
          customerPhone: currentPhone,
          customerName: currentName
        });
        logger.info({ callId, correlationId, appointmentId: appointment.appointmentId, selectedSlot }, "Appointment booked from speech");
        logger.info({ callId, correlationId, event }, "Zadarma event processed");
        return { accepted: true };
      }

      await setCallState(callId, "SLOT_COLLECTION", {
        lastBotReply: "Ese horario ya no esta disponible. Prefieres 09:30 o 11:00?",
        aiProvider: "rule-engine",
        aiModel: "slot-parser-v1",
        aiFallback: false,
        customerPhone: currentPhone,
        customerName: currentName
      });
      logger.info({ callId, correlationId, event }, "Zadarma event processed");
      return { accepted: true };
    }

    const answer = await generateReplyText({
      transcript,
      context: { callId, intent: "book_appointment" }
    });

    await setCallState(callId, "SLOT_COLLECTION", {
      lastBotReply: answer.text,
      aiProvider: answer.provider || "deepseek",
      aiModel: answer.model || env.DEEPSEEK_MODEL,
      aiFallback: Boolean(answer.fallback),
      customerPhone: currentPhone,
      customerName: currentName
    });

    logger.info({ callId, correlationId, answer: answer.text }, "Generated DeepSeek response");
  }

  if (event === "call.ended") {
    await setCallState(callId, "ENDED", { outcome: normalized.outcome || "unknown" });
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
  await setCallState(callId, "INTENT_CAPTURE", { direction: "outbound", campaign });

  if (!result.ok) {
    await setCallState(callId, "FAILED", { outcome: "telephony_error" });
  }

  return result;
}
