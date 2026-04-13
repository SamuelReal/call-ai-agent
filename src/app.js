import express from "express";
import { env } from "./config/env.js";
import { requestContextMiddleware } from "./shared/request-context.js";
import { registerRoutes } from "./http/routes/index.js";
import { logger } from "./observability/logger.js";
import { getReadinessReport } from "./ops/readiness.service.js";

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
    const report = await getReadinessReport();
    return res.status(report.status === "ready" ? 200 : 503).json(report);
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
