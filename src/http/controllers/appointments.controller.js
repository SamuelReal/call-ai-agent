import { z } from "zod";
import { checkAvailability, createAppointment } from "../../modules/appointments/appointment.service.js";

const availabilitySchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  timezone: z.string().optional()
});

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  slot: z.string(),
  source: z.string().default("voice_bot")
});

export async function availabilityHandler(req, res) {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const slots = await checkAvailability(parsed.data);
  return res.status(200).json({ slots });
}

export async function createAppointmentHandler(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", details: parsed.error.flatten() });
  }

  const appointment = await createAppointment(parsed.data);
  if (!appointment) {
    return res.status(409).json({ error: "slot_unavailable" });
  }

  return res.status(201).json(appointment);
}
