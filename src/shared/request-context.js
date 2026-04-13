import { randomUUID } from "node:crypto";

export function requestContextMiddleware(req, res, next) {
  const incoming = req.header("x-correlation-id");
  req.correlationId = incoming || randomUUID();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
}
