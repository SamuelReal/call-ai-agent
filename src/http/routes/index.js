import { Router } from "express";
import { callsRouter } from "./calls.routes.js";
import { telephonyRouter } from "./telephony.routes.js";
import { appointmentsRouter } from "./appointments.routes.js";
import { customersRouter } from "./customers.routes.js";
import { realtimeRouter } from "./realtime.routes.js";

export function registerRoutes(app) {
  const router = Router();

  router.use("/calls", callsRouter);
  router.use("/telephony", telephonyRouter);
  router.use("/appointments", appointmentsRouter);
  router.use("/customers", customersRouter);
  router.use("/realtime", realtimeRouter);

  app.use("/api/v1", router);
}
