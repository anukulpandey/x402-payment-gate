import type { Request, Response, NextFunction } from 'express';

// Sliding-window per-IP rate limiter. Per-instance memory: authoritative on a
// long-running server, best-effort on serverless (each instance has its own
// window). Acceptable because the real cost ceiling is signature verification.

const WINDOW_MS = 60_000;
const MAX_REQ = 60;
const MAX_IPS = 10_000;

const hits = new Map<string, number[]>();

// The `x-gatekeep-internal: probe` header is only trusted from the loopback
// socket — the dashboard playground calls the gateway on 127.0.0.1 (see
// api.ts simulate). `req.socket.remoteAddress` is the real peer and cannot be
// spoofed by a remote client (unlike a plain header or X-Forwarded-For), so an
// external attacker can't set the header to skip the limiter.
function isLoopback(req: Request): boolean {
  const a = req.socket?.remoteAddress ?? '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

export function gatewayRateLimit(req: Request, res: Response, next: NextFunction): void {
  // Dashboard price probes (local, server-to-server) must never be limited.
  if (req.header('x-gatekeep-internal') === 'probe' && isLoopback(req)) {
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
