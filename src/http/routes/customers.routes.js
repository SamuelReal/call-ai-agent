import { Router } from "express";
import {
  createCustomerHandler,
  getCustomerByPhoneHandler,
  listCustomersHandler,
  updateCustomerNameHandler
} from "../controllers/customers.controller.js";
import { requireInternalApiKey } from "../middlewares/internal-auth.middleware.js";
import { createInMemoryRateLimiter } from "../middlewares/rate-limit.middleware.js";
import { env } from "../../config/env.js";

export const customersRouter = Router();

const internalRateLimiter = createInMemoryRateLimiter({
  maxRequests: env.INTERNAL_RATE_LIMIT_MAX,
  windowMs: env.INTERNAL_RATE_LIMIT_WINDOW_MS,
  scope: "customers-internal"
});

customersRouter.use(requireInternalApiKey);
customersRouter.use(internalRateLimiter);

customersRouter.get("/", listCustomersHandler);
customersRouter.get("/lookup", getCustomerByPhoneHandler);
customersRouter.post("/", createCustomerHandler);
customersRouter.patch("/:phone", updateCustomerNameHandler);
