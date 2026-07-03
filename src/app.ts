import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { store } from './store.js';
import { gatewayRateLimit } from './rateLimit.js';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { gatewayRouter } from './routes/gateway.js';
import { facilitatorRouter } from './routes/facilitator.js';

// The configured Express app, with no `listen()` — so it can be driven both by a
// long-running server (src/server.ts) and a serverless function (api/index.ts).
export const app = express();
app.disable('x-powered-by');
// Behind Vercel/Render the client IP arrives via X-Forwarded-For; without this
// req.ip would be the proxy's address and the rate limiter would lump everyone
// into one bucket.
app.set('trust proxy', 1);
app.use(
  cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['X-PAYMENT-RESPONSE', 'X-Gatekeep-Charged', 'X-Gatekeep-Tx'],
  }),
);
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true, mode: config.mode }));

// Load the latest store snapshot before each data request. No-op for the file
// backend (resident in memory); fetches the blob from Redis on serverless hosts
// where each invocation starts cold.
app.use((req, res, next) => {
  void store
    .load()
    .then(() => next())
    .catch(() => next());
});

// The gateway proxies arbitrary upstreams, so it needs the raw request body
// (mounted before any JSON parser). Rate-limited per IP — it's the only
// unauthenticated write-ish surface.
app.use('/g', gatewayRateLimit, express.raw({ type: '*/*', limit: '5mb' }), gatewayRouter);

// JSON control-plane APIs.
app.use('/api/auth', express.json({ limit: '1mb' }), authRouter);
app.use('/api', express.json({ limit: '1mb' }), apiRouter);
app.use('/facilitator', express.json({ limit: '1mb' }), facilitatorRouter);

// Serve the built dashboard when present (local / Render). On Vercel the static
// site is served by the CDN and these paths never reach the function.
const distDir = path.resolve('web/dist');
const hasDist = fs.existsSync(distDir);
if (hasDist) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/g') ||
      req.path.startsWith('/facilitator')
    ) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) =>
    res.json({
      service: 'GateKeep',
      tagline: 'Stripe for AI agent API calls',
      mode: config.mode,
      dashboard: 'run `npm run dev`, then open http://localhost:5173',
    }),
  );
}

// Last resort: async route errors forwarded by asyncRoute() land here instead
// of crashing the process (or hanging the request).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[gatekeep] unhandled route error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal_error' });
});

export default app;
