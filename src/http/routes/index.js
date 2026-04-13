import { Router } from "express";
import { callsRouter } from "./calls.routes.js";
import { telephonyRouter } from "./telephony.routes.js";
import { appointmentsRouter } from "./appointments.routes.js";

export function registerRoutes(app) {
  const router = Router();

  router.use("/calls", callsRouter);
  router.use("/telephony", telephonyRouter);
  router.use("/appointments", appointmentsRouter);

  app.use("/api/v1", router);
}
