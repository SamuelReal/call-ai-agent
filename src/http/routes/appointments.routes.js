import { Router } from "express";
import { availabilityHandler, createAppointmentHandler } from "../controllers/appointments.controller.js";

export const appointmentsRouter = Router();

appointmentsRouter.post("/availability", availabilityHandler);
appointmentsRouter.post("/", createAppointmentHandler);
