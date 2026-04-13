import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

function buildHeaders() {
  const headers = {
    "content-type": "application/json"
  };

  if (env.APPOINTMENTS_API_KEY) {
    headers.authorization = `Bearer ${env.APPOINTMENTS_API_KEY}`;
  }

  return headers;
}

export async function apiCheckAvailability(query) {
  const response = await fetch(`${env.APPOINTMENTS_API_BASE_URL}${env.APPOINTMENTS_API_AVAILABILITY_PATH}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(query || {})
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Appointments API availability error ${response.status}: ${body}`);
  }

  const data = await response.json();
  if (!Array.isArray(data?.slots)) {
    throw new Error("Appointments API availability response missing slots array");
  }

  return data.slots;
}

export async function apiCreateAppointment(payload) {
  const response = await fetch(`${env.APPOINTMENTS_API_BASE_URL}${env.APPOINTMENTS_API_CREATE_PATH}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn({ status: response.status, body }, "Appointments API create failed");
    if (response.status === 409) {
      return null;
    }
    throw new Error(`Appointments API create error ${response.status}: ${body}`);
  }

  return response.json();
}
