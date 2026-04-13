import { Router } from "express";
import { createOutboundCallHandler, getCallStatusHandler } from "../controllers/calls.controller.js";

export const callsRouter = Router();

callsRouter.post("/outbound", createOutboundCallHandler);
callsRouter.get("/:callId", getCallStatusHandler);
