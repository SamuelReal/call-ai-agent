import WebSocket from "ws";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const baseUrl = process.env.BASE_WS_URL || "ws://localhost:3000";
const args = process.argv.slice(2);
const strictNoFallback = args.includes("--assert-no-fallback");
const callId = args.find((arg) => !arg.startsWith("--")) || "zd_realtime_1";
const fallbackTranscript = "hola, necesito una cita para manana por la manana";
const fixturePath = process.env.REALTIME_AUDIO_FIXTURE || resolve(process.cwd(), "scripts/fixtures/e2e-es.wav");
const timeoutMs = Number(process.env.REALTIME_E2E_TIMEOUT_MS || 45000);

let seenStt = false;
let seenTts = false;
let sttFallback = false;
let ttsFallback = false;
let settled = false;

function finish(code, payload) {
  if (settled) {
    return;
  }
  settled = true;
  if (payload) {
    // eslint-disable-next-line no-console
    (code === 0 ? console.log : console.error)(payload);
  }
  process.exit(code);
}

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

function buildSineWaveWavBuffer({
  sampleRate = 16000,
  durationSeconds = 1.6,
  frequencyHz = 440,
  amplitude = 0.2
} = {}) {
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const bytesPerSample = 2;
  const channels = 1;
  const dataSize = totalSamples * bytesPerSample * channels;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16); // PCM header size
  wav.writeUInt16LE(1, 20); // PCM format
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  wav.writeUInt16LE(channels * bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * amplitude;
    const int16 = Math.max(-1, Math.min(1, sample)) * 32767;
    wav.writeInt16LE(Math.round(int16), 44 + i * 2);
  }

  return wav;
}

function tryGenerateSyntheticFixtureWav(path) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const wav = buildSineWaveWavBuffer();
    writeFileSync(path, wav);
    return existsSync(path);
  } catch {
    return false;
  }
}

function loadAudioFixtureBase64() {
  if (!existsSync(fixturePath)) {
    let generated = tryGenerateFixtureWav(fixturePath, fallbackTranscript);
    if (!generated) {
      generated = tryGenerateSyntheticFixtureWav(fixturePath);
    }
    if (generated) {
      // eslint-disable-next-line no-console
      console.log({ type: "fixture.generated", path: fixturePath });
    }
  }

  if (!existsSync(fixturePath)) {
    if (strictNoFallback) {
      throw new Error("missing_audio_fixture_for_strict_mode");
    }
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

let fixtureAudioBase64;
try {
  fixtureAudioBase64 = loadAudioFixtureBase64();
} catch (error) {
  finish(1, {
    type: "assertion.failed",
    reason: "missing_fixture",
    path: fixturePath,
    message: error?.message || "unable_to_prepare_audio_fixture"
  });
}

const ws = new WebSocket(`${baseUrl}/ws/realtime?callId=${encodeURIComponent(callId)}`);
const watchdog = setTimeout(() => {
  finish(1, { type: "assertion.failed", reason: "timeout", timeoutMs });
}, timeoutMs);

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
  clearTimeout(watchdog);
  if (strictNoFallback) {
    const missing = [];
    if (!seenStt) {
      missing.push("stt.transcript");
    }
    if (!seenTts) {
      missing.push("tts.audio");
    }

    if (missing.length > 0) {
      finish(1, { type: "assertion.failed", reason: "missing_events", missing });
      return;
    }

    if (sttFallback || ttsFallback) {
      finish(1, { type: "assertion.failed", reason: "fallback_detected", sttFallback, ttsFallback });
      return;
    }

    finish(0, { type: "assertion.passed", strictNoFallback: true });
    return;
  }

  finish(0);
});

ws.on("error", (err) => {
  clearTimeout(watchdog);
  finish(1, { type: "assertion.failed", reason: "ws_error", message: err.message });
});
