function nowMs() {
  return Date.now();
}

export function createInMemoryRateLimiter({ maxRequests, windowMs, scope }) {
  const bucket = new Map();

  return function inMemoryRateLimiter(req, res, next) {
    const identifier = req.ip || "unknown";
    const key = `${scope}:${identifier}`;

    const current = bucket.get(key);
    const now = nowMs();

    if (!current || now > current.resetAt) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("retry-after", String(Math.max(retryAfterSec, 1)));
      return res.status(429).json({
        error: "rate_limited",
        message: "too many requests",
        scope
      });
    }

    current.count += 1;
    bucket.set(key, current);
    return next();
  };
}
