import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
// Built by `npm run vercel-build` (tsc) before functions are bundled.
import app from '../dist/app.js';

type VercelReq = IncomingMessage & { body?: unknown };

/**
 * Vercel serverless entry for the whole Express app.
 *
 * Vercel's Node runtime may buffer/parse the request body before handing it to
 * us, which would leave Express's body parsers (express.json / express.raw)
 * reading an already-drained stream. If a body is present, re-expose it as a
 * fresh readable stream so Express parses it correctly.
 */
export default function handler(req: VercelReq, res: ServerResponse) {
  const body = req.body;
  if (body !== undefined && body !== null && body !== '') {
    const raw = Buffer.isBuffer(body)
      ? body
      : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const stream = Readable.from(raw) as unknown as Record<string, unknown>;
    const r = req as unknown as Record<string, unknown>;
    for (const m of ['read', 'on', 'once', 'pipe', 'unpipe', 'removeListener', 'resume', 'pause'] as const) {
      const fn = stream[m];
      if (typeof fn === 'function') r[m] = (fn as (...a: unknown[]) => unknown).bind(stream);
    }
    req.headers['content-length'] = String(raw.length);
    delete req.headers['content-encoding'];
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
