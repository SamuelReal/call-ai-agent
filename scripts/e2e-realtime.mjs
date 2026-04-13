import WebSocket from "ws";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const baseUrl = process.env.BASE_WS_URL || "ws://localhost:3000";
const args = process.argv.slice(2);
const strictNoFallback = args.includes("--assert-no-fallback");
const callId = args.find((arg) => !arg.startsWith("--")) || "zd_realtime_1";
const ws = new WebSocket(`${baseUrl}/ws/realtime?callId=${encodeURIComponent(callId)}`);
const fallbackTranscript = "hola, necesito una cita para manana por la manana";
const fixturePath = process.env.REALTIME_AUDIO_FIXTURE || resolve(process.cwd(), "scripts/fixtures/e2e-es.wav");

let seenStt = false;
let seenTts = false;
let sttFallback = false;
let ttsFallback = false;

function commandAvailable(name) {
  const result = spawnSync("which", [name], { stdio: "ignore" });
  return result.status === 0;
}

function tryGenerateFixtureWav(path, text) {
  if (process.platform !== "darwin") {
    return false;
  }
  if (!commandAvailable("say") || !commandAvailable("afconvert")) {
    return false;
  }

  mkdirSync(dirname(path), { recursive: true });
  const tempAiffPath = path.replace(/\.wav$/i, ".aiff");

  const say = spawnSync("say", ["-o", tempAiffPath, text], { stdio: "ignore" });
  if (say.status !== 0) {
    return false;
  }

  const convert = spawnSync("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", tempAiffPath, path], {
    stdio: "ignore"
  });

  rmSync(tempAiffPath, { force: true });
  return convert.status === 0 && existsSync(path);
}

function loadAudioFixtureBase64() {
  if (!existsSync(fixturePath)) {
    const generated = tryGenerateFixtureWav(fixturePath, fallbackTranscript);
    if (generated) {
      // eslint-disable-next-line no-console
      console.log({ type: "fixture.generated", path: fixturePath });
    }
  }

  if (!existsSync(fixturePath)) {
    // eslint-disable-next-line no-console
    console.warn({
      type: "fixture.missing",
      path: fixturePath,
      detail: "using plain-text base64 fallback; STT provider may reject invalid audio"
    });
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

  if (msg.type === "stt.transcript") {
    seenStt = true;
    sttFallback = Boolean(msg.fallback);
  }

  if (msg.type === "tts.audio") {
    seenTts = true;
    ttsFallback = Boolean(msg.fallback);
  }

  if (msg.type === "session.ready") {
    sendAudioChunk(fallbackTranscript, true);
    return;
  }

  if (msg.type === "tts.audio") {
    ws.close();
  }
});

ws.on("close", () => {
  if (strictNoFallback) {
    const missing = [];
    if (!seenStt) {
      missing.push("stt.transcript");
    }
    if (!seenTts) {
      missing.push("tts.audio");
    }

    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.error({ type: "assertion.failed", reason: "missing_events", missing });
      process.exit(1);
      return;
    }

    if (sttFallback || ttsFallback) {
      // eslint-disable-next-line no-console
      console.error({ type: "assertion.failed", reason: "fallback_detected", sttFallback, ttsFallback });
      process.exit(1);
      return;
    }

    // eslint-disable-next-line no-console
    console.log({ type: "assertion.passed", strictNoFallback: true });
  }

  process.exit(0);
});

ws.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("realtime test failed", err.message);
  process.exit(1);
});
