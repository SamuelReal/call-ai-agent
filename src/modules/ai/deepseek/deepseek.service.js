import { env } from "../../../config/env.js";

export async function generateReplyText({ transcript, context }) {
  if (!env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      model: env.DEEPSEEK_MODEL,
      text: buildMockReply(transcript, context)
    };
  }

  return {
    provider: "deepseek",
    model: env.DEEPSEEK_MODEL,
    text: buildMockReply(transcript, context)
  };
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
