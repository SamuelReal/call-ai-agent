import { env } from "../config/env.js";
import { pingMySql } from "../db/mysql.js";

function requiresMySqlReadiness() {
  if (env.STORAGE_PROVIDER === "mysql") {
    return true;
  }
  return env.APPOINTMENTS_PROVIDER === "mysql";
}

function requiresElevenLabsCredentials() {
  return env.STT_PROVIDER === "elevenlabs" || env.TTS_PROVIDER === "elevenlabs";
}

export async function getReadinessReport() {
  const checks = {
    app: { ok: true },
    mysql: { ok: true, required: requiresMySqlReadiness() },
    deepseek: {
      ok: Boolean(env.DEEPSEEK_API_KEY),
      required: env.NODE_ENV === "production"
    },
    elevenlabs: {
      ok: Boolean(env.ELEVENLABS_API_KEY),
      required: requiresElevenLabsCredentials()
    },
    realtimeWsToken: {
      ok: Boolean(env.REALTIME_WS_TOKEN),
      required: env.NODE_ENV === "production"
    }
  };

  if (checks.mysql.required) {
    try {
      await pingMySql();
    } catch (error) {
      checks.mysql = {
        ...checks.mysql,
        ok: false,
        error: env.NODE_ENV === "production" ? "mysql_unavailable" : error?.message
      };
    }
  }

  const ready = Object.values(checks).every((item) => !item.required || item.ok);
  return {
    status: ready ? "ready" : "not_ready",
    service: "call-ai-agent",
    checks
  };
}
