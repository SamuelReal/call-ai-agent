import WebSocket from "ws";

const baseUrl = process.env.BASE_WS_URL || "ws://localhost:3000";
const callId = process.argv[2] || "zd_realtime_1";
const ws = new WebSocket(`${baseUrl}/ws/realtime?callId=${encodeURIComponent(callId)}`);

function sendAudioChunk(transcript, isFinal = true) {
  ws.send(
    JSON.stringify({
      type: "audio_chunk",
      audioBase64: Buffer.from(transcript, "utf8").toString("base64"),
      simulatedTranscript: transcript,
      isFinal
    })
  );
}

ws.on("open", () => {
  // keepalive ping
  ws.send(JSON.stringify({ type: "ping" }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(String(raw));
  // eslint-disable-next-line no-console
  console.log(msg);

  if (msg.type === "session.ready") {
    sendAudioChunk("hola, necesito una cita para manana por la manana", true);
    return;
  }

  if (msg.type === "tts.audio") {
    ws.close();
  }
});

ws.on("close", () => {
  process.exit(0);
});

ws.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("realtime test failed", err.message);
  process.exit(1);
});
