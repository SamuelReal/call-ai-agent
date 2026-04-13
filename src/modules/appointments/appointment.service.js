import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";
import { apiCheckAvailability, apiCreateAppointment } from "./appointment.api.js";
import { findAvailability, saveAppointment } from "./appointment.store.js";

export async function checkAvailability(query) {
  if (env.APPOINTMENTS_PROVIDER !== "api") {
    return findAvailability();
  }

  try {
    return await withTimeout(apiCheckAvailability(query), env.APPOINTMENTS_TIMEOUT_MS);
  } catch (error) {
    logger.warn({ err: error?.message }, "Appointments API unavailable, fallback to memory slots");
    return findAvailability();
  }
}

export async function createAppointment(payload) {
  if (env.APPOINTMENTS_PROVIDER !== "api") {
    return saveAppointment(payload);
  }

  try {
    const created = await withTimeout(apiCreateAppointment(payload), env.APPOINTMENTS_TIMEOUT_MS);
    return created;
  } catch (error) {
    logger.warn({ err: error?.message }, "Appointments API create failed, fallback to memory booking");
    return saveAppointment(payload);
  }
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`timeout_${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}
