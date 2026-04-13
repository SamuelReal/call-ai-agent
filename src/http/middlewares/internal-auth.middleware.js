import { env } from "../../config/env.js";

export function requireInternalApiKey(req, res, next) {
  if (!env.INTERNAL_API_KEY) {
    return next();
  }

  const provided = req.header("x-internal-api-key");
  if (!provided || provided !== env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "unauthorized", message: "invalid internal api key" });
  }

  return next();
}
