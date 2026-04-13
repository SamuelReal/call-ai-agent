import { findAvailability, saveAppointment } from "./appointment.store.js";

export function checkAvailability(_query) {
  return findAvailability();
}

export function createAppointment(payload) {
  return saveAppointment(payload);
}
