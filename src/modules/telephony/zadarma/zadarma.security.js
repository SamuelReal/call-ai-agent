import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";

export function isValidZadarmaSignature(payload, signatureHeader) {
  if (!env.ZADARMA_SECRET) {
    return true;
  }

  if (!signatureHeader || typeof signatureHeader !== "string") {
    return false;
  }

  const raw = JSON.stringify(payload ?? {});
  const digest = createHmac("sha256", env.ZADARMA_SECRET).update(raw).digest("hex");

  const a = Buffer.from(digest);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
