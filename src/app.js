import express from "express";
import { env } from "./config/env.js";
import { requestContextMiddleware } from "./shared/request-context.js";
import { registerRoutes } from "./http/routes/index.js";
import { logger } from "./observability/logger.js";
import { pingMySql } from "./db/mysql.js";

function requiresMySqlReadiness() {
  if (env.STORAGE_PROVIDER === "mysql") {
    return true;
  }
  return env.APPOINTMENTS_PROVIDER === "mysql";
}

function requiresElevenLabsCredentials() {
  return env.STT_PROVIDER === "elevenlabs" || env.TTS_PROVIDER === "elevenlabs";
}

export function createApp() {
  const app = express();

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        req.rawBody = buffer.toString("utf8");
      }
    })
  );
  app.use(requestContextMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "call-ai-agent" });
  });

  app.get("/ready", async (_req, res) => {
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
    const body = {
      status: ready ? "ready" : "not_ready",
      service: "call-ai-agent",
      checks
    };

    return res.status(ready ? 200 : 503).json(body);
  });

  app.get("/version", (_req, res) => {
    res.status(200).json({ apiVersion: env.API_VERSION, nodeEnv: env.NODE_ENV });
  });

  registerRoutes(app);

  app.use((err, req, res, _next) => {
    logger.error({ err: err?.message, stack: err?.stack, correlationId: req.correlationId }, "Unhandled request error");
    const message = env.NODE_ENV === "production" ? "unexpected internal error" : err.message;
    res.status(500).json({ error: "internal_error", message });
  });

  return app;
}
