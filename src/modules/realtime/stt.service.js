import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

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

function decodeBase64ToBuffer(audioBase64) {
  if (!audioBase64) {
    return Buffer.alloc(0);
  }
  try {
    return Buffer.from(audioBase64, "base64");
  } catch {
    return Buffer.alloc(0);
  }
}

async function transcribeWithElevenLabs({ audioBase64 }) {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("missing_elevenlabs_api_key");
  }

  const audioBuffer = decodeBase64ToBuffer(audioBase64);
  if (audioBuffer.length === 0) {
    return "";
  }

  const formData = new FormData();
  formData.append("model_id", env.ELEVENLABS_STT_MODEL_ID);
  formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "chunk.wav");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ELEVENLABS_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.ELEVENLABS_BASE_URL}/v1/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY
      },
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`elevenlabs_stt_http_${response.status}:${body}`);
    }

    const data = await response.json();
    return String(data?.text || data?.transcript || "").trim();
  } finally {
    clearTimeout(timeout);
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

  if (provider === "elevenlabs") {
    try {
      const transcript = await transcribeWithElevenLabs({ audioBase64 });
      return {
        provider,
        text: transcript,
        isFinal: Boolean(isFinal)
      };
    } catch (error) {
      logger.warn({ err: error?.message }, "ElevenLabs STT failed, falling back to mock transcript decode");
      const fallbackText = String(simulatedTranscript || decodeBase64ToText(audioBase64) || "").trim();
      return {
        provider,
        text: fallbackText,
        isFinal: Boolean(isFinal),
        fallback: true
      };
    }
  }

  return {
    provider,
    text: String(simulatedTranscript || "").trim(),
    isFinal: Boolean(isFinal)
  };
}
