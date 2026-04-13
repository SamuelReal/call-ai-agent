import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

function textToBase64(text) {
  return Buffer.from(String(text || ""), "utf8").toString("base64");
}

async function synthesizeWithElevenLabs(text) {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("missing_elevenlabs_api_key");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ELEVENLABS_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${env.ELEVENLABS_BASE_URL}/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_TTS_VOICE_ID)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "audio/mpeg",
          "xi-api-key": env.ELEVENLABS_API_KEY
        },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          model_id: env.ELEVENLABS_TTS_MODEL_ID
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`elevenlabs_tts_http_${response.status}:${body}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return {
      provider: "elevenlabs",
      mimeType: "audio/mpeg;base64",
      audioBase64: audioBuffer.toString("base64")
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizeSpeech({ text }) {
  const provider = env.TTS_PROVIDER;

  if (provider === "mock") {
    return {
      provider,
      mimeType: "audio/plain;base64",
      audioBase64: textToBase64(text)
    };
  }

  if (provider === "elevenlabs") {
    try {
      return await synthesizeWithElevenLabs(text);
    } catch (error) {
      logger.warn({ err: error?.message }, "ElevenLabs TTS failed, falling back to mock audio");
      return {
        provider,
        mimeType: "audio/plain;base64",
        audioBase64: textToBase64(text),
        fallback: true
      };
    }
  }

  return {
    provider,
    mimeType: "audio/plain;base64",
    audioBase64: textToBase64(text)
  };
}
