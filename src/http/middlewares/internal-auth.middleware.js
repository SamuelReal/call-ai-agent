import { env } from "../../config/env.js";
import { timingSafeEqual } from "node:crypto";

function safeEquals(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function requireInternalApiKey(req, res, next) {
  if (!env.INTERNAL_API_KEY) {
    return next();
  }

  const provided = req.header("x-internal-api-key");
  if (!provided || !safeEquals(provided, env.INTERNAL_API_KEY)) {
    return res.status(401).json({ error: "unauthorized", message: "invalid internal api key" });
  }

  return next();
}
