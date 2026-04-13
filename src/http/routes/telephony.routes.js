import { Router } from "express";
import { zadarmaWebhookEchoHandler, zadarmaWebhookHandler } from "../controllers/telephony.controller.js";
import { createInMemoryRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";

export const telephonyRouter = Router();

const webhookRateLimiter = createInMemoryRateLimiter({
	maxRequests: env.WEBHOOK_RATE_LIMIT_MAX,
	windowMs: env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
	scope: "telephony-webhook"
});

telephonyRouter.post("/zadarma/webhook", webhookRateLimiter, asyncHandler(zadarmaWebhookHandler));
telephonyRouter.get("/zadarma/webhook", asyncHandler(zadarmaWebhookEchoHandler));
