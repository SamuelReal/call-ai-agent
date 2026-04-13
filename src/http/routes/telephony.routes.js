import { Router } from "express";
import { zadarmaWebhookHandler } from "../controllers/telephony.controller.js";

export const telephonyRouter = Router();

telephonyRouter.post("/zadarma/webhook", zadarmaWebhookHandler);
