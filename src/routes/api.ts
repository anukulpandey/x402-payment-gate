import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { config, isLive, platformFeeRate } from '../config.js';
import { store } from '../store.js';
import { round6, splitRevenue } from '../revenue.js';
import { addressForKey, signPayment } from '../x402/signer.js';
import { encodePaymentHeader } from '../x402/protocol.js';
import { requireAuth, ownerOf } from '../auth.js';
import { EXAMPLES } from '../seed.js';
import type { GatedEndpoint } from '../types.js';

export const apiRouter = Router();

const agentAddress = addressForKey(config.agentPrivateKey);

// ── Public runtime config (consumed by the dashboard + wallet). ──
apiRouter.get('/config', (_req, res) => {
  res.json({
    mode: config.mode,
    live: isLive,
    network: config.network,
    chainId: config.chainId,
    publicBaseUrl: config.publicBaseUrl,
    platformWallet: config.platformWallet,
    platformFeeBps: config.platformFeeBps,
    platformFeeRate,
    agentAddress,
    chain: isLive ? { chainId: config.chainId, rpcUrl: config.rpcUrl, usdcAddress: config.usdcAddress } : null,
  });
});

// ── Per-endpoint aggregate stats. ──
function endpointStats(id: string) {
  const calls = store.callsForEndpoint(id);
  const paid = calls.filter((c) => c.paid);
  return {
    totalRequests: calls.length,
    paidCalls: paid.length,
    grossUsd: round6(paid.reduce((s, c) => s + c.amountUsd, 0)),
    earningsUsd: round6(paid.reduce((s, c) => s + c.sellerEarningsUsd, 0)),
    feeUsd: round6(paid.reduce((s, c) => s + c.platformFeeUsd, 0)),
    lastCallTs: calls[0]?.ts,
  };
}

function withStats(e: GatedEndpoint) {
  return { ...e, gatedUrl: `${config.publicBaseUrl}/g/${e.id}`, stats: endpointStats(e.id) };
}

// Everything below requires a signed-in wallet (the seller).
apiRouter.use(requireAuth);

// ── List / create the seller's endpoints. ──
apiRouter.get('/endpoints', (req, res) => {
  res.json(store.listEndpoints(ownerOf(req)).map(withStats));
});

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  upstreamUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']).default('ANY'),
  priceUsd: z.coerce.number().min(0.000001).max(1000),
  description: z.string().trim().max(280).optional().default(''),
});

apiRouter.post('/endpoints', (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid endpoint', issues: parsed.error.flatten() });
    return;
  }
  const endpoint: GatedEndpoint = {
    id: nanoid(8),
    ownerAddress: ownerOf(req),
    createdAt: Date.now(),
    active: true,
    ...parsed.data,
  };
  store.addEndpoint(endpoint);
  res.status(201).json(withStats(endpoint));
});

// Seed the seller's account with the example endpoints.
apiRouter.post('/examples', (req, res) => {
  const owner = ownerOf(req);
  const existing = new Set(store.listEndpoints(owner).map((e) => e.name));
  let added = 0;
  for (const ex of EXAMPLES) {
    if (existing.has(ex.name)) continue;
    store.addEndpoint({ id: nanoid(8), ownerAddress: owner, createdAt: Date.now() - added * 1000, active: true, ...ex });
    added++;
  }
  res.json({ added, endpoints: store.listEndpoints(owner).map(withStats) });
});

// Resolve an endpoint and enforce ownership.
function ownedEndpoint(req: { params: { id: string } } & object, owner: string) {
  const e = store.getEndpoint((req.params as { id: string }).id);
  if (!e || e.ownerAddress !== owner) return null;
  return e;
}

apiRouter.get('/endpoints/:id', (req, res) => {
  const e = ownedEndpoint(req, ownerOf(req));
  if (!e) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ...withStats(e), recentCalls: store.listCalls(20, e.id) });
});

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  priceUsd: z.coerce.number().min(0.000001).max(1000).optional(),
  description: z.string().trim().max(280).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']).optional(),
  active: z.boolean().optional(),
});

apiRouter.patch('/endpoints/:id', (req, res) => {
  if (!ownedEndpoint(req, ownerOf(req))) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid patch', issues: parsed.error.flatten() });
    return;
  }
  const updated = store.updateEndpoint(req.params.id, parsed.data)!;
  res.json(withStats(updated));
});

apiRouter.delete('/endpoints/:id', (req, res) => {
  if (!ownedEndpoint(req, ownerOf(req))) {
    res.status(404).json({ deleted: false, error: 'Not found' });
    return;
  }
  res.json({ deleted: store.deleteEndpoint(req.params.id) });
});

// ── The seller's call feed + earnings. ──
apiRouter.get('/calls', (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
  res.json(store.callsForOwner(ownerOf(req), limit));
});

apiRouter.get('/stats', (req, res) => {
  const owner = ownerOf(req);
  const calls = store.callsForOwner(owner);
  const paid = calls.filter((c) => c.paid);
  res.json({
    endpoints: store.listEndpoints(owner).length,
    totalRequests: calls.length,
    paidCalls: paid.length,
    grossUsd: round6(paid.reduce((s, c) => s + c.amountUsd, 0)),
    earningsUsd: round6(paid.reduce((s, c) => s + c.sellerEarningsUsd, 0)),
    feeUsd: round6(paid.reduce((s, c) => s + c.platformFeeUsd, 0)),
  });
});

// ── Agent playground: run the full pay round-trip and return a transcript. ──
interface Step {
  n: number;
  title: string;
  kind: 'request' | 'quote' | 'sign' | 'pay' | 'settle' | 'deliver' | 'split';
  detail: string;
  data?: unknown;
}

apiRouter.post('/endpoints/:id/simulate', async (req, res) => {
  const endpoint = ownedEndpoint(req, ownerOf(req));
  if (!endpoint || !endpoint.active) {
    res.status(404).json({ error: 'No active gated endpoint with that id.' });
    return;
  }
  const method = endpoint.method === 'ANY' ? 'GET' : endpoint.method;
  const gatedUrl = `http://127.0.0.1:${config.port}/g/${endpoint.id}`;
  const steps: Step[] = [];
  const t0 = Date.now();

  try {
    steps.push({
      n: 1,
      title: 'Agent calls the gated URL',
      kind: 'request',
      detail: `${method} ${gatedUrl} — no payment attached yet.`,
      data: { method, url: `${config.publicBaseUrl}/g/${endpoint.id}` },
    });

    const probe = await fetch(gatedUrl, { method, headers: { 'x-gatekeep-internal': 'probe' } });
    const quote = await probe.json();
    if (probe.status !== 402) {
      res.status(500).json({ error: `Expected 402, got ${probe.status}`, steps, quote });
      return;
    }
    const requirements = quote.accepts[0];
    steps.push({
      n: 2,
      title: '402 Payment Required',
      kind: 'quote',
      detail: `GateKeep quotes ${fmtAtomic(requirements)} on ${requirements.network}.`,
      data: requirements,
    });

    const payload = await signPayment(config.agentPrivateKey, requirements);
    const inner = payload.payload as { signature: string; authorization: Record<string, string> };
    steps.push({
      n: 3,
      title: 'Agent signs a USDC payment authorization',
      kind: 'sign',
      detail: `EIP-712 transferWithAuthorization signed by ${shorten(agentAddress)} — gasless, offline.`,
      data: {
        authorization: { ...inner.authorization, value: `${inner.authorization.value} (atomic)` },
        signature: `${inner.signature.slice(0, 22)}…${inner.signature.slice(-8)}`,
      },
    });

    const header = encodePaymentHeader(payload);
    steps.push({
      n: 4,
      title: 'Agent retries with X-PAYMENT',
      kind: 'pay',
      detail: `${method} ${gatedUrl} with a base64 X-PAYMENT header (${header.length} bytes).`,
      data: { 'X-PAYMENT': `${header.slice(0, 40)}…` },
    });

    const paid = await fetch(gatedUrl, { method, headers: { 'X-PAYMENT': header } });
    const paymentResponseHeader = paid.headers.get('X-PAYMENT-RESPONSE');
    const settlement = paymentResponseHeader
      ? JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString('utf8'))
      : null;
    if (paid.status === 402) {
      res.status(402).json({ error: 'Payment rejected', detail: await paid.json(), steps });
      return;
    }

    steps.push({
      n: 5,
      title: isLive ? 'Facilitator settles on-chain' : 'Facilitator verifies + settles',
      kind: 'settle',
      detail: settlement?.simulated
        ? 'Signature verified cryptographically; settlement simulated (mock mode).'
        : 'Payment verified and settled on-chain via the x402 facilitator.',
      data: settlement,
    });

    const contentType = paid.headers.get('content-type') ?? '';
    const raw = await paid.text();
    steps.push({
      n: 6,
      title: `${paid.status} ${paid.statusText} — response delivered`,
      kind: 'deliver',
      detail: `Upstream answered in ${Date.now() - t0}ms (${contentType || 'unknown type'}).`,
      data: { status: paid.status, contentType, bodyPreview: previewBody(raw, contentType) },
    });

    const { platformFeeUsd, sellerEarningsUsd } = splitRevenue(endpoint.priceUsd);
    steps.push({
      n: 7,
      title: 'Revenue split',
      kind: 'split',
      detail: `You earn $${sellerEarningsUsd} of the $${endpoint.priceUsd} charge.`,
      data: {
        grossUsd: endpoint.priceUsd,
        sellerEarningsUsd,
        platformFeeUsd,
        payer: settlement?.payer ?? agentAddress,
        txHash: settlement?.transaction,
      },
    });

    res.json({
      ok: true,
      mode: config.mode,
      endpoint: { id: endpoint.id, name: endpoint.name, priceUsd: endpoint.priceUsd },
      durationMs: Date.now() - t0,
      steps,
    });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed', detail: err instanceof Error ? err.message : String(err), steps });
  }
});

// ── formatting helpers ──
function shorten(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
function fmtAtomic(req: { maxAmountRequired: string; extra?: { name?: string } }): string {
  return `$${Number(req.maxAmountRequired) / 1e6} ${req.extra?.name ?? 'USDC'}`;
}
function previewBody(raw: string, contentType: string): string {
  let text = raw;
  if (contentType.includes('application/json')) {
    try {
      text = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* leave as-is */
    }
  }
  return text.length > 1400 ? `${text.slice(0, 1400)}\n… (truncated)` : text;
}
