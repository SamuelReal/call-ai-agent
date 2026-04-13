import { createHash } from "node:crypto";
import { env } from "../../../config/env.js";
import { ensureMySqlSchema, getMySqlPool } from "../../../db/mysql.js";

const inMemorySeen = new Map();
const TTL_MS = 60 * 60 * 1000;
const MAX_IN_MEMORY_KEYS = 10000;

function nowMs() {
  return Date.now();
}

function pruneInMemorySeen() {
  const now = nowMs();

  if (inMemorySeen.size > MAX_IN_MEMORY_KEYS) {
    for (const [key, expiresAt] of inMemorySeen.entries()) {
      if (expiresAt <= now) {
        inMemorySeen.delete(key);
      }
    }

    if (inMemorySeen.size > MAX_IN_MEMORY_KEYS) {
      const overflow = inMemorySeen.size - MAX_IN_MEMORY_KEYS;
      let dropped = 0;
      for (const key of inMemorySeen.keys()) {
        inMemorySeen.delete(key);
        dropped += 1;
        if (dropped >= overflow) {
          break;
        }
      }
    }
  }
}

export function buildWebhookEventKey({ payload, rawBody, signature, timestamp }) {
  const normalizedPayload = rawBody || JSON.stringify(payload || {});
  const base = `${timestamp || ""}|${signature || ""}|${normalizedPayload}`;
  return createHash("sha256").update(base).digest("hex");
}

async function rememberInMemory(eventKey) {
  pruneInMemorySeen();
  const current = inMemorySeen.get(eventKey);
  const now = nowMs();

  if (current && current > now) {
    return false;
  }

  inMemorySeen.set(eventKey, now + TTL_MS);
  return true;
}

async function rememberInMySql({ eventKey, event, callId, provider, payload }) {
  await ensureMySqlSchema();
  const db = getMySqlPool();

  const [result] = await db.query(
    `
      INSERT IGNORE INTO webhook_events (event_key, provider, event_name, call_id, payload_json)
      VALUES (?, ?, ?, ?, CAST(? AS JSON))
    `,
    [eventKey, provider, event || null, callId || null, JSON.stringify(payload || {})]
  );

  return Number(result?.affectedRows || 0) > 0;
}

export async function registerWebhookEvent({ eventKey, provider, event, callId, payload }) {
  if (!eventKey) {
    return true;
  }

  if (env.STORAGE_PROVIDER === "mysql") {
    try {
      return await rememberInMySql({ eventKey, provider, event, callId, payload });
    } catch {
      return rememberInMemory(eventKey);
    }
  }

  return rememberInMemory(eventKey);
}
