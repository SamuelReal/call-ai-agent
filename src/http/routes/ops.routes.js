import { Router } from "express";
import { getRuntimeSnapshotHandler } from "../controllers/ops.controller.js";
import { requireInternalApiKey } from "../middlewares/internal-auth.middleware.js";
import { createInMemoryRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";

export const opsRouter = Router();

const internalRateLimiter = createInMemoryRateLimiter({
  maxRequests: env.INTERNAL_RATE_LIMIT_MAX,
  windowMs: env.INTERNAL_RATE_LIMIT_WINDOW_MS,
  scope: "ops-internal"
});

opsRouter.use(requireInternalApiKey);
opsRouter.use(internalRateLimiter);

opsRouter.get("/runtime", asyncHandler(getRuntimeSnapshotHandler));
