import WebSocket from "ws";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.BASE_WS_URL || "ws://localhost:3000";
const callId = process.argv[2] || "zd_realtime_1";
const ws = new WebSocket(`${baseUrl}/ws/realtime?callId=${encodeURIComponent(callId)}`);
const fallbackTranscript = "hola, necesito una cita para manana por la manana";

function loadAudioFixtureBase64() {
  const fixturePath = process.env.REALTIME_AUDIO_FIXTURE || resolve(process.cwd(), "scripts/fixtures/e2e-es.wav");
  if (!existsSync(fixturePath)) {
    return null;
  }
  return readFileSync(fixturePath).toString("base64");
}

const fixtureAudioBase64 = loadAudioFixtureBase64();

function sendAudioChunk(transcript, isFinal = true) {
  ws.send(
    JSON.stringify({
      type: "audio_chunk",
      audioBase64: fixtureAudioBase64 || Buffer.from(transcript, "utf8").toString("base64"),
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
    sendAudioChunk(fallbackTranscript, true);
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
