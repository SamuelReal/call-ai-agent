import { WebSocketServer } from "ws";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";
import { generateReplyText } from "../ai/deepseek/deepseek.service.js";
import { getCallStatus, setCallState } from "../calls/call.service.js";
import { synthesizeSpeech } from "./tts.service.js";
import { transcribeAudioChunk } from "./stt.service.js";

const sessions = new Map();

function parseCallIdFromRequest(urlValue) {
  const url = new URL(urlValue, "http://localhost");
  const callId = url.searchParams.get("callId");
  return callId ? callId.trim() : "";
}

function safeSend(ws, payload) {
  if (ws.readyState !== ws.OPEN) {
    return;
  }
  ws.send(JSON.stringify(payload));
}

async function handleAudioChunk(ws, message) {
  const session = sessions.get(ws);
  if (!session?.callId) {
    safeSend(ws, { type: "error", message: "callId not found in session" });
    return;
  }

  const stt = await transcribeAudioChunk({
    audioBase64: message.audioBase64,
    simulatedTranscript: message.simulatedTranscript,
    isFinal: message.isFinal
  });

  safeSend(ws, {
    type: "stt.transcript",
    provider: stt.provider,
    text: stt.text,
    isFinal: stt.isFinal
  });

  if (!stt.isFinal || !stt.text) {
    return;
  }

  const currentCall = (await getCallStatus(session.callId)) || {};
  const answer = await generateReplyText({
    transcript: stt.text,
    context: {
      callId: session.callId,
      intent: currentCall.intent || "book_appointment"
    }
  });

  await setCallState(session.callId, "SLOT_COLLECTION", {
    lastUserTranscript: stt.text,
    lastBotReply: answer.text,
    aiProvider: answer.provider || "deepseek",
    aiModel: answer.model || env.DEEPSEEK_MODEL,
    aiFallback: Boolean(answer.fallback)
  });

  safeSend(ws, {
    type: "llm.reply",
    provider: answer.provider || "deepseek",
    model: answer.model || env.DEEPSEEK_MODEL,
    text: answer.text,
    fallback: Boolean(answer.fallback)
  });

  const tts = await synthesizeSpeech({ text: answer.text });
  safeSend(ws, {
    type: "tts.audio",
    provider: tts.provider,
    mimeType: tts.mimeType,
    audioBase64: tts.audioBase64
  });
}

function handleClientMessage(ws, raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    safeSend(ws, { type: "error", message: "invalid_json" });
    return;
  }

  if (message.type === "audio_chunk") {
    handleAudioChunk(ws, message).catch((error) => {
      logger.error({ err: error?.message }, "Realtime audio chunk processing failed");
      safeSend(ws, { type: "error", message: "processing_error" });
    });
    return;
  }

  if (message.type === "ping") {
    safeSend(ws, { type: "pong", ts: Date.now() });
    return;
  }

  safeSend(ws, { type: "error", message: "unsupported_message_type" });
}

export function setupRealtimeGateway(httpServer) {
  const wsPath = env.REALTIME_WS_PATH;
  const wss = new WebSocketServer({ server: httpServer, path: wsPath });

  wss.on("connection", async (ws, req) => {
    const callId = parseCallIdFromRequest(req.url || "");
    sessions.set(ws, { callId });

    if (!callId) {
      safeSend(ws, { type: "error", message: "missing_callId_query_param" });
      ws.close(1008, "missing callId");
      return;
    }

    await setCallState(callId, "INTENT_CAPTURE", {
      realtimeConnected: true,
      sttProvider: env.STT_PROVIDER,
      ttsProvider: env.TTS_PROVIDER
    });

    safeSend(ws, {
      type: "session.ready",
      callId,
      sttProvider: env.STT_PROVIDER,
      ttsProvider: env.TTS_PROVIDER
    });

    ws.on("message", (raw) => handleClientMessage(ws, raw));

    ws.on("close", () => {
      sessions.delete(ws);
    });
  });

  logger.info({ wsPath }, "Realtime WebSocket gateway initialized");
  return wss;
}
