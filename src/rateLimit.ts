import type { Request, Response, NextFunction } from 'express';

// Sliding-window per-IP rate limiter. Per-instance memory: authoritative on a
// long-running server, best-effort on serverless (each instance has its own
// window). Acceptable because the real cost ceiling is signature verification.

const WINDOW_MS = 60_000;
const MAX_REQ = 60;
const MAX_IPS = 10_000;

const hits = new Map<string, number[]>();

export function gatewayRateLimit(req: Request, res: Response, next: NextFunction): void {
  // Dashboard price probes must never be limited.
  if (req.header('x-gatekeep-internal') === 'probe') {
    next();
    return;
  }

  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);

  if (list.length >= MAX_REQ) {
    // Oldest timestamp in the window tells the caller when a slot frees up.
    res.setHeader('Retry-After', Math.ceil((list[0] + WINDOW_MS - now) / 1000));
    res.status(429).json({
      error: 'rate_limited',
      message: 'Max 60 requests/min per IP on gated endpoints.',
    });
    return;
  }

  list.push(now);
  hits.set(ip, list);

  // Crude but bounded: evict the oldest inserted key so the map can't grow forever.
  if (hits.size > MAX_IPS) {
    hits.delete(hits.keys().next().value as string);
  }

  next();
}
