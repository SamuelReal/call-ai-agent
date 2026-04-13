import { Router } from "express";
import { getRealtimeStatsHandler, resetRealtimeStatsHandler } from "../controllers/realtime.controller.js";
import { requireInternalApiKey } from "../middlewares/internal-auth.middleware.js";
import { env } from "../../config/env.js";
import { createInMemoryRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";

export const realtimeRouter = Router();

const internalRateLimiter = createInMemoryRateLimiter({
  maxRequests: env.INTERNAL_RATE_LIMIT_MAX,
  windowMs: env.INTERNAL_RATE_LIMIT_WINDOW_MS,
  scope: "realtime-internal"
});

realtimeRouter.use(requireInternalApiKey);
realtimeRouter.use(internalRateLimiter);

realtimeRouter.get("/stats", asyncHandler(getRealtimeStatsHandler));
realtimeRouter.post("/stats/reset", asyncHandler(resetRealtimeStatsHandler));
