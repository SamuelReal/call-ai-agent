import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";

function toSafeBuffer(value) {
  return Buffer.from(String(value || ""), "utf8");
}

function equalsConstantTime(a, b) {
  const first = toSafeBuffer(a);
  const second = toSafeBuffer(b);
  if (first.length !== second.length) {
    return false;
  }
  return timingSafeEqual(first, second);
}

function normalizeSignature(input) {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.replace(/^sha256=/i, "").trim();
}

export function isValidZadarmaSignature({ payload, rawBody, signatureHeader, timestampHeader }) {
  if (!env.ZADARMA_SECRET) {
    return true;
  }

  if (!signatureHeader || typeof signatureHeader !== "string" || !timestampHeader) {
    return false;
  }

  const timestampMs = Number(timestampHeader) * 1000;
  if (Number.isNaN(timestampMs)) {
    return false;
  }

  const ageSec = Math.abs(Date.now() - timestampMs) / 1000;
  if (ageSec > env.ZADARMA_WEBHOOK_TOLERANCE_SEC) {
    return false;
  }

  const raw = rawBody || JSON.stringify(payload ?? {});
  const signed = `${timestampHeader}.${raw}`;
  const digest = createHmac("sha256", env.ZADARMA_SECRET).update(signed).digest("hex");
  return equalsConstantTime(digest, normalizeSignature(signatureHeader));
}

export function createZadarmaApiSignature({ method, path, body }) {
  if (!env.ZADARMA_API_KEY || !env.ZADARMA_API_SECRET) {
    return null;
  }

  const nonce = Date.now().toString();
  const payload = `${nonce}${method.toUpperCase()}${path}${body || ""}`;
  const hash = createHmac("sha256", env.ZADARMA_API_SECRET).update(payload).digest("base64");
  return {
    nonce,
    authorization: `${env.ZADARMA_API_KEY}:${hash}`
  };
}
