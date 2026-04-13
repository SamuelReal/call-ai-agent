const bookedSlots = new Set();
const appointments = new Map();

export function findAvailability() {
  return [
    "2026-04-16T09:30:00+02:00",
    "2026-04-16T11:00:00+02:00",
    "2026-04-16T16:00:00+02:00"
  ].filter((slot) => !bookedSlots.has(slot));
}

export function saveAppointment(payload) {
  if (bookedSlots.has(payload.slot)) {
    return null;
  }

  const appointmentId = `apt_${Math.random().toString(36).slice(2, 10)}`;
  bookedSlots.add(payload.slot);
  const appointment = {
    appointmentId,
    status: "confirmed",
    ...payload,
    createdAt: new Date().toISOString()
  };
  appointments.set(appointmentId, appointment);
  return appointment;
}
