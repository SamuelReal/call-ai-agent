import { env } from "../../config/env.js";

function textToBase64(text) {
  return Buffer.from(String(text || ""), "utf8").toString("base64");
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

  return {
    provider,
    mimeType: "audio/plain;base64",
    audioBase64: textToBase64(text)
  };
}
