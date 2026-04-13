import { Router } from "express";
import { availabilityHandler, createAppointmentHandler } from "../controllers/appointments.controller.js";
import { requireInternalApiKey } from "../middlewares/internal-auth.middleware.js";
import { env } from "../../config/env.js";
import { createInMemoryRateLimiter } from "../middlewares/rate-limit.middleware.js";

export const appointmentsRouter = Router();

const internalRateLimiter = createInMemoryRateLimiter({
	maxRequests: env.INTERNAL_RATE_LIMIT_MAX,
	windowMs: env.INTERNAL_RATE_LIMIT_WINDOW_MS,
	scope: "appointments-internal"
});

appointmentsRouter.use(requireInternalApiKey);
appointmentsRouter.use(internalRateLimiter);

appointmentsRouter.post("/availability", availabilityHandler);
appointmentsRouter.post("/", createAppointmentHandler);
