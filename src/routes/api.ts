import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { config, isLive, erc8004Enabled, platformFeeRate } from '../config.js';
import { store } from '../store.js';
import { round6, splitRevenue } from '../revenue.js';
import { computeAnalytics } from '../analytics.js';
import { generateDemoCalls } from '../demo-data.js';
import { addressForKey, signPayment } from '../x402/signer.js';
import { encodePaymentHeader } from '../x402/protocol.js';
import { requireAuth, ownerOf } from '../auth.js';
import { asyncRoute } from '../http.js';
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
    erc8004: erc8004Enabled
      ? { identityRegistry: config.identityRegistry, reputationRegistry: config.reputationRegistry }
      : null,
  });
});

// ── Per-endpoint aggregate stats. ──
// Excludes demo traffic so the dashboard's per-gate earnings match the
// withdrawable balance (which also ignores demo). Demo data is an
// analytics-page concept only.
function endpointStats(id: string) {
  const calls = store.callsForEndpoint(id).filter((c) => !c.demo);
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
  requireIdentity: z.coerce.boolean().optional().default(false),
  minReputation: z.coerce.number().int().min(0).max(1000).optional().default(0),
});

apiRouter.post('/endpoints', asyncRoute(async (req, res) => {
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
  await store.addEndpoint(endpoint);
  res.status(201).json(withStats(endpoint));
}));

// Seed the seller's account with the example endpoints.
async function seedExamples(owner: string): Promise<number> {
  const existing = new Set(store.listEndpoints(owner).map((e) => e.name));
  let added = 0;
  for (const ex of EXAMPLES) {
    if (existing.has(ex.name)) continue;
    await store.addEndpoint({ id: nanoid(8), ownerAddress: owner, createdAt: Date.now() - added * 1000, active: true, ...ex });
    added++;
  }
  return added;
}

apiRouter.post('/examples', asyncRoute(async (req, res) => {
  const owner = ownerOf(req);
  const added = await seedExamples(owner);
  res.json({ added, endpoints: store.listEndpoints(owner).map(withStats) });
}));

// Serialize an owner's mutating requests so two concurrent calls can't
// interleave a read-modify-write (double payout, duplicated demo sets).
const inFlight = new Set<string>();
function lock(key: string): boolean {
  if (inFlight.has(key)) return false;
  inFlight.add(key);
  return true;
}

// ── Demo traffic: synthetic 30-day history so analytics demos well. ──
// Records are flagged `demo: true`, never carry a txHash, and are excluded from
// withdrawable earnings — so they can't pollute a real on-chain payout. Note:
// bulk-adding ≤300 records can evict the oldest records via the global 2000-cap.
apiRouter.post('/demo-data', asyncRoute(async (req, res) => {
  const owner = ownerOf(req);
  if (!lock(`demo:${owner}`)) {
    res.status(409).json({ error: 'Demo data is already being generated.' });
    return;
  }
  try {
    if (store.listEndpoints(owner).length === 0) await seedExamples(owner);
    await store.removeDemoCalls(owner); // idempotent regenerate
    const added = await store.addCallsBulk(generateDemoCalls(store.listEndpoints(owner)));
    res.json({ added });
  } finally {
    inFlight.delete(`demo:${owner}`);
  }
}));

apiRouter.delete('/demo-data', asyncRoute(async (req, res) => {
  res.json({ removed: await store.removeDemoCalls(ownerOf(req)) });
}));

// Resolve an endpoint and enforce ownership.
function ownedEndpoint(req: { params: Record<string, string | undefined> }, owner: string) {
  const e = store.getEndpoint(req.params.id ?? '');
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
  requireIdentity: z.coerce.boolean().optional(),
  minReputation: z.coerce.number().int().min(0).max(1000).optional(),
});

apiRouter.patch('/endpoints/:id', asyncRoute(async (req, res) => {
  if (!ownedEndpoint(req, ownerOf(req))) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid patch', issues: parsed.error.flatten() });
    return;
  }
  const updated = (await store.updateEndpoint(req.params.id, parsed.data))!;
  res.json(withStats(updated));
}));

apiRouter.delete('/endpoints/:id', asyncRoute(async (req, res) => {
  if (!ownedEndpoint(req, ownerOf(req))) {
    res.status(404).json({ deleted: false, error: 'Not found' });
    return;
  }
  res.json({ deleted: await store.deleteEndpoint(req.params.id) });
}));

// ── The seller's call feed + earnings. ──
apiRouter.get('/calls', (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
  res.json(store.callsForOwner(ownerOf(req), limit));
});

// Full withdrawal history for the Payouts page (newest first).
apiRouter.get('/withdrawals', (req, res) => {
  res.json(store.withdrawalsForOwner(ownerOf(req)));
});

apiRouter.get('/stats', (req, res) => {
  const owner = ownerOf(req);
  const calls = store.callsForOwner(owner);
  const paid = calls.filter((c) => c.paid);
  // Withdrawable money comes from REAL settled calls only — demo records are
  // synthetic and must never be payable on-chain.
  const realPaid = paid.filter((c) => !c.demo);
  const earningsUsd = round6(realPaid.reduce((s, c) => s + c.sellerEarningsUsd, 0));
  const withdrawnUsd = round6(store.withdrawnUsdForOwner(owner));
  res.json({
    endpoints: store.listEndpoints(owner).length,
    totalRequests: calls.length,
    paidCalls: paid.length,
    grossUsd: round6(paid.reduce((s, c) => s + c.amountUsd, 0)),
    earningsUsd,
    feeUsd: round6(paid.reduce((s, c) => s + c.platformFeeUsd, 0)),
    withdrawnUsd,
    availableUsd: round6(Math.max(0, earningsUsd - withdrawnUsd)),
    canWithdraw: isLive && !!config.platformPrivateKey,
    lastWithdrawal: store.withdrawalsForOwner(owner)[0] ?? null,
    hasDemoData: calls.some((c) => c.demo),
    demoEarningsUsd: round6(paid.filter((c) => c.demo).reduce((s, c) => s + c.sellerEarningsUsd, 0)),
  });
});

// ── Owner analytics: time-series, per-endpoint breakdown, agents, latency. ──
const RangeSchema = z.enum(['24h', '7d', '30d']).catch('7d');
apiRouter.get('/analytics', (req, res) => {
  const owner = ownerOf(req);
  res.json(
    computeAnalytics(
      {
        calls: store.callsForOwner(owner),
        endpoints: store.listEndpoints(owner),
        ledgerAtCap: store.allCalls().length >= 2000,
      },
      RangeSchema.parse(req.query.range),
    ),
  );
});

// ── Withdraw earned USDC to your wallet (on-chain payout). ──
function explorerTx(hash: string): string {
  if (config.chainId === 43113) return `https://testnet.snowtrace.io/tx/${hash}`;
  if (config.chainId === 43114) return `https://snowtrace.io/tx/${hash}`;
  return hash;
}

apiRouter.post('/withdraw', asyncRoute(async (req, res) => {
  const owner = ownerOf(req);
  if (!isLive || !config.platformPrivateKey) {
    res.status(400).json({ error: 'Withdrawals require chain mode with a funded platform wallet.' });
    return;
  }
  // Guard against a double-payout race: two concurrent withdrawals would both
  // read the same available balance and each fire an on-chain transfer before
  // either records a Withdrawal. Serialize per owner.
  if (!lock(`withdraw:${owner}`)) {
    res.status(409).json({ error: 'A withdrawal is already in progress.' });
    return;
  }
  try {
    // `!c.demo`: synthetic demo traffic is never withdrawable.
    const paid = store.callsForOwner(owner).filter((c) => c.paid && !c.demo);
    const earningsUsd = round6(paid.reduce((s, c) => s + c.sellerEarningsUsd, 0));
    const withdrawnUsd = round6(store.withdrawnUsdForOwner(owner));
    const availableUsd = round6(earningsUsd - withdrawnUsd);
    const atomic = BigInt(Math.round(availableUsd * 10 ** config.usdcDecimals));
    if (atomic <= 0n) {
      res.status(400).json({ error: 'Nothing to withdraw yet.' });
      return;
    }
    const { payoutUsdc } = await import('../x402/chain.js');
    const txHash = await payoutUsdc(owner, atomic);
    await store.addWithdrawal({ id: nanoid(10), ownerAddress: owner, amountUsd: availableUsd, txHash, ts: Date.now() });
    res.json({ txHash, amountUsd: availableUsd, to: owner, explorerUrl: explorerTx(txHash) });
  } catch (err) {
    res.status(500).json({ error: 'Payout failed', detail: err instanceof Error ? err.message : String(err) });
  } finally {
    inFlight.delete(`withdraw:${owner}`);
  }
}));

// ── Agent playground: run the full pay round-trip and return a transcript. ──
interface Step {
  n: number;
  title: string;
  kind: 'request' | 'quote' | 'sign' | 'pay' | 'settle' | 'deliver' | 'split';
  detail: string;
  data?: unknown;
}

apiRouter.post('/endpoints/:id/simulate', asyncRoute(async (req, res) => {
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
}));

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
