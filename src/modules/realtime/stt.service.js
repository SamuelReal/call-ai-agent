import { env } from "../../config/env.js";

function decodeBase64ToText(audioBase64) {
  if (!audioBase64) {
    return "";
  }
  try {
    const raw = Buffer.from(audioBase64, "base64").toString("utf8");
    return raw.trim();
  } catch {
    return "";
  }
}

export async function transcribeAudioChunk({ audioBase64, simulatedTranscript, isFinal }) {
  const provider = env.STT_PROVIDER;

  if (provider === "mock") {
    const transcript = String(simulatedTranscript || decodeBase64ToText(audioBase64) || "").trim();
    return {
      provider,
      text: transcript,
      isFinal: Boolean(isFinal)
    };
  }

  return {
    provider,
    text: String(simulatedTranscript || "").trim(),
    isFinal: Boolean(isFinal)
  };
}
