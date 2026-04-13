import { Router } from "express";
import { createOutboundCallHandler, getCallStatusHandler } from "../controllers/calls.controller.js";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";

export const callsRouter = Router();

callsRouter.post("/outbound", asyncHandler(createOutboundCallHandler));
callsRouter.get("/:callId", asyncHandler(getCallStatusHandler));
