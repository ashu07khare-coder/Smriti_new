import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const windowMs = 60 * 1000; // 1 minute window
const maxRequests = 120; // 120 requests per minute per IP

const ipMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipMap.entries()) {
    if (record.resetAt <= now) {
      ipMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();

  const record = ipMap.get(ip);
  if (!record || record.resetAt <= now) {
    ipMap.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  record.count += 1;
  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfterSeconds: retryAfter,
    });
    return;
  }

  next();
}
