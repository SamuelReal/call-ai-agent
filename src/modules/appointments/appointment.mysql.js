import { getMySqlPool, ensureMySqlSchema } from "../../db/mysql.js";

const DEFAULT_SLOTS = [
  "2026-04-16T09:30:00+02:00",
  "2026-04-16T11:00:00+02:00",
  "2026-04-16T16:00:00+02:00"
];

function nextAppointmentId() {
  return `apt_${Math.random().toString(36).slice(2, 10)}`;
}

export async function mysqlFindAvailability() {
  await ensureMySqlSchema();
  const db = getMySqlPool();

  const [rows] = await db.query(
    "SELECT slot FROM appointments WHERE status = 'confirmed' AND slot IN (?)",
    [DEFAULT_SLOTS]
  );

  const booked = new Set(rows.map((row) => row.slot));
  return DEFAULT_SLOTS.filter((slot) => !booked.has(slot));
}

export async function mysqlCreateAppointment(payload) {
  await ensureMySqlSchema();

  const appointment = {
    appointmentId: nextAppointmentId(),
    status: "confirmed",
    name: String(payload.name || "").trim(),
    phone: String(payload.phone || "").trim(),
    slot: String(payload.slot || "").trim(),
    source: String(payload.source || "voice_bot").trim()
  };

  const db = getMySqlPool();
  try {
    await db.query(
      `
        INSERT INTO appointments (appointment_id, name, phone, slot, source, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        appointment.appointmentId,
        appointment.name,
        appointment.phone,
        appointment.slot,
        appointment.source,
        appointment.status
      ]
    );
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return null;
    }
    throw error;
  }

  return {
    ...appointment,
    createdAt: new Date().toISOString()
  };
}