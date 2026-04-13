import { getMySqlPool, ensureMySqlSchema } from "../../db/mysql.js";

export async function mysqlReadCall(callId) {
  await ensureMySqlSchema();
  const db = getMySqlPool();
  const [rows] = await db.query("SELECT data_json FROM calls WHERE call_id = ? LIMIT 1", [callId]);
  if (!rows[0]?.data_json) {
    return null;
  }

  const data = rows[0].data_json;
  if (typeof data === "string") {
    return JSON.parse(data);
  }
  return data;
}

export async function mysqlUpsertCall(callId, payload) {
  await ensureMySqlSchema();
  const current = (await mysqlReadCall(callId)) || {};
  const next = {
    ...current,
    ...payload,
    callId,
    updatedAt: new Date().toISOString()
  };

  const db = getMySqlPool();
  await db.query(
    `
      INSERT INTO calls (call_id, data_json)
      VALUES (?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE
        data_json = VALUES(data_json),
        updated_at = CURRENT_TIMESTAMP
    `,
    [callId, JSON.stringify(next)]
  );

  return next;
}