import { env } from "../../../config/env.js";
import { logger } from "../../../observability/logger.js";

export async function generateReplyText({ transcript, context }) {
  if (!env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      model: env.DEEPSEEK_MODEL,
      text: buildMockReply(transcript, context)
    };
  }

  try {
    const text = await generateWithDeepSeekApi({ transcript, context });
    return {
      provider: "deepseek",
      model: env.DEEPSEEK_MODEL,
      text
    };
  } catch (error) {
    logger.warn({ err: error?.message }, "DeepSeek API failed, using mock reply fallback");
    return {
      provider: "deepseek",
      model: env.DEEPSEEK_MODEL,
      text: buildMockReply(transcript, context),
      fallback: true
    };
  }
}

async function generateWithDeepSeekApi({ transcript, context }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.DEEPSEEK_TIMEOUT_MS);

  const prompt = [
    "Eres un agente de llamadas para agendamiento de citas.",
    "Responde en espanol claro y breve.",
    "Siempre propone opciones de horario concretas cuando aplique.",
    "No inventes datos externos.",
    `Intencion actual: ${context.intent || "book_appointment"}`,
    `Texto del usuario: ${String(transcript || "")}`
  ].join("\n");

  try {
    const response = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Asistente de voz para agendamiento telefonico."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`DeepSeek HTTP ${response.status}: ${body}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("DeepSeek response did not include message content");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function buildMockReply(transcript, context) {
  const lowered = String(transcript || "").toLowerCase();

  if (lowered.includes("manana") || lowered.includes("mañana")) {
    return "Perfecto, para manana tengo dos opciones: 09:30 o 11:00. Cual prefieres?";
  }

  if (lowered.includes("tarde")) {
    return "De acuerdo, por la tarde tengo disponibilidad a las 16:00 y 17:30. Cual te viene mejor?";
  }

  return `Entendido. Te ayudo con tu cita. Podrias confirmar tu preferencia de horario? (contexto: ${context.intent})`;
}
