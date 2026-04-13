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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toNativeSignature(content, secret) {
  return createHmac("sha1", secret).update(content).digest("base64");
}

function valueForSignature(value) {
  if (value == null) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function getNativeSignatureCandidates(payload) {
  const event = normalizeText(payload?.event).toUpperCase();
  const callStart = valueForSignature(payload?.call_start);
  const callerId = valueForSignature(payload?.caller_id);
  const calledDid = valueForSignature(payload?.called_did);
  const destination = valueForSignature(payload?.destination);
  const internal = valueForSignature(payload?.internal);
  const pbxCallId = valueForSignature(payload?.pbx_call_id);
  const callIdWithRec = valueForSignature(payload?.call_id_with_rec);
  const result = valueForSignature(payload?.result);

  const candidates = [];

  if (["NOTIFY_START", "NOTIFY_INTERNAL", "NOTIFY_END", "NOTIFY_IVR"].includes(event)) {
    candidates.push(`${callerId}${calledDid}${callStart}`);
  }

  if (event === "NOTIFY_ANSWER") {
    candidates.push(`${callerId}${destination}${callStart}`);
  }

  if (["NOTIFY_OUT_START", "NOTIFY_OUT_END"].includes(event)) {
    candidates.push(`${internal}${destination}${callStart}`);
  }

  if (event === "NOTIFY_RECORD") {
    candidates.push(`${pbxCallId}${callIdWithRec}`);
  }

  if (["NUMBER_LOOKUP", "CALL_TRACKING", "SMS"].includes(event)) {
    candidates.push(result);
  }

  if (result) {
    candidates.push(result);
  }

  return candidates.filter((candidate) => candidate.length > 0);
}

function isValidZadarmaNativeSignature({ payload, nativeSignatureHeader }) {
  const provided = normalizeText(nativeSignatureHeader);
  if (!provided) {
    return false;
  }

  const secret = normalizeText(env.ZADARMA_API_SECRET || env.ZADARMA_SECRET);
  if (!secret) {
    return false;
  }

  const candidates = getNativeSignatureCandidates(payload);
  if (!candidates.length) {
    return false;
  }

  return candidates.some((candidate) => equalsConstantTime(toNativeSignature(candidate, secret), provided));
}

export function isValidZadarmaSignature({ payload, rawBody, signatureHeader, timestampHeader, nativeSignatureHeader }) {
  if (!env.ZADARMA_SECRET) {
    return isValidZadarmaNativeSignature({ payload, nativeSignatureHeader });
  }

  if (signatureHeader && typeof signatureHeader === "string" && timestampHeader) {
    const timestampMs = Number(timestampHeader) * 1000;
    if (!Number.isNaN(timestampMs)) {
      const ageSec = Math.abs(Date.now() - timestampMs) / 1000;
      if (ageSec <= env.ZADARMA_WEBHOOK_TOLERANCE_SEC) {
        const raw = rawBody || JSON.stringify(payload ?? {});
        const signed = `${timestampHeader}.${raw}`;
        const digest = createHmac("sha256", env.ZADARMA_SECRET).update(signed).digest("hex");
        if (equalsConstantTime(digest, normalizeSignature(signatureHeader))) {
          return true;
        }
      }
    }
  }

  return isValidZadarmaNativeSignature({ payload, nativeSignatureHeader });
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
