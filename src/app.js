import express from "express";
import { env } from "./config/env.js";
import { requestContextMiddleware } from "./shared/request-context.js";
import { registerRoutes } from "./http/routes/index.js";
import { logger } from "./observability/logger.js";

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

  app.get("/version", (_req, res) => {
    res.status(200).json({ apiVersion: env.API_VERSION, nodeEnv: env.NODE_ENV });
  });

  registerRoutes(app);

  app.use((err, req, res, _next) => {
    logger.error({ err: err?.message, stack: err?.stack, correlationId: req.correlationId }, "Unhandled request error");
    res.status(500).json({ error: "internal_error", message: err.message });
  });

  return app;
}
