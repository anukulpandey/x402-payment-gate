import { Router, type Request, type Response } from 'express';
import { Buffer } from 'node:buffer';
import { nanoid } from 'nanoid';
import { config, erc8004Enabled } from '../config.js';
import { store } from '../store.js';
import { splitRevenue } from '../revenue.js';
import { assertPublicUrl } from '../net/ssrf.js';
import { resolveAgent, giveFeedback, type AgentIdentity } from '../erc8004/registry.js';
import {
  buildPaymentRequirements,
  decodePaymentHeader,
  X402_VERSION,
} from '../x402/protocol.js';
import { verifyPayment, settlePayment, type SettleResult } from '../x402/facilitator.js';
import type { GatedEndpoint, CallRecord, PaymentRequirements } from '../types.js';

/** Headers we must not forward to the upstream origin. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  // payment + credential headers that must never leak to the (operator-supplied) upstream
  'x-payment',
  'cookie',
  'authorization',
  'x-gatekeep-internal',
]);

function subPathOf(req: Request): string {
  const captured = (req.params as Record<string, string>)[0];
  return captured ? `/${captured}` : '';
}

/** Compose the upstream target, correctly merging existing + caller query strings. */
function targetUrl(endpoint: GatedEndpoint, req: Request): string {
  const url = new URL(endpoint.upstreamUrl);
  const sub = subPathOf(req);
  if (sub) url.pathname = url.pathname.replace(/\/$/, '') + sub;
  const qIndex = req.originalUrl.indexOf('?');
  if (qIndex >= 0) {
    const callerParams = new URLSearchParams(req.originalUrl.slice(qIndex + 1));
    for (const [k, v] of callerParams) url.searchParams.append(k, v);
  }
  return url.toString();
}

function resourceUrl(endpoint: GatedEndpoint, req: Request): string {
  return `${config.publicBaseUrl}/g/${endpoint.id}${subPathOf(req)}`;
}

function recordCall(partial: Omit<CallRecord, 'id'>): void {
  store.addCall({ id: nanoid(10), ...partial });
}

/** A 402 response: quote the price and (optionally) record the unpaid attempt. */
function require402(
  res: Response,
  requirements: PaymentRequirements,
  base: Pick<CallRecord, 'endpointId' | 'ownerAddress' | 'endpointName' | 'ts' | 'method' | 'path' | 'network'>,
  error: string,
  payer: string | undefined,
  record: boolean,
): void {
  res.status(402).json({ x402Version: X402_VERSION, error, accepts: [requirements] });
  if (record) {
    recordCall({
      ...base,
      status: 402,
      paid: false,
      amountUsd: 0,
      platformFeeUsd: 0,
      sellerEarningsUsd: 0,
      payer,
      durationMs: Date.now() - base.ts,
    });
  }
}

async function handleGateway(req: Request, res: Response): Promise<void> {
  const started = Date.now();
  // Internal probe (from the dashboard playground discovering the price) — don't
  // pollute the ledger with its throwaway 402.
  const isProbe = req.header('x-gatekeep-internal') === 'probe';

  const endpoint = store.getEndpoint(req.params.id);
  if (!endpoint || !endpoint.active) {
    res.status(404).json({ error: 'No active gated endpoint with that id.' });
    return;
  }
  if (endpoint.method !== 'ANY' && req.method !== endpoint.method) {
    res.status(405).json({ error: `This gate only accepts ${endpoint.method} requests.` });
    return;
  }

  const requirements = buildPaymentRequirements({
    priceUsd: endpoint.priceUsd,
    resource: resourceUrl(endpoint, req),
    description: endpoint.description || `${endpoint.name} (via GateKeep)`,
    payTo: config.platformWallet,
  });

  const base = {
    endpointId: endpoint.id,
    ownerAddress: endpoint.ownerAddress,
    endpointName: endpoint.name,
    ts: started,
    method: req.method,
    path: `/g/${endpoint.id}${subPathOf(req)}`,
    network: requirements.network,
  };

  // ── 1. No payment → HTTP 402 with requirements. ──
  const paymentHeader = req.header('X-PAYMENT');
  if (!paymentHeader) {
    require402(res, requirements, base, 'X-PAYMENT header is required', undefined, !isProbe);
    return;
  }

  // ── 2. Decode + verify the signed payment (offchain). ──
  let payload;
  try {
    payload = decodePaymentHeader(paymentHeader);
  } catch {
    require402(res, requirements, base, 'invalid_payload', undefined, !isProbe);
    return;
  }

  const verification = await verifyPayment(payload, requirements);
  if (!verification.isValid) {
    require402(res, requirements, base, verification.invalidReason ?? 'invalid_payment', verification.payer, !isProbe);
    return;
  }

  // ── 2b. ERC-8004: resolve the payer's identity + reputation, enforce policy. ──
  let agent: AgentIdentity | null = null;
  if (erc8004Enabled && verification.payer) {
    agent = await resolveAgent(verification.payer);
    if (endpoint.requireIdentity && !agent) {
      res.status(403).json({
        error: 'agent_identity_required',
        message:
          'This gate only serves agents with a registered ERC-8004 identity. Register one and bind your payment wallet, then retry.',
      });
      if (!isProbe) recordCall({ ...base, status: 403, paid: false, amountUsd: 0, platformFeeUsd: 0, sellerEarningsUsd: 0, payer: verification.payer, durationMs: Date.now() - started });
      return;
    }
    const minRep = endpoint.minReputation ?? 0;
    if (minRep > 0 && (!agent || agent.reputation < minRep)) {
      res.status(403).json({
        error: 'insufficient_agent_reputation',
        message: `This gate requires an agent reputation of ${minRep}+; yours is ${agent?.reputation ?? 0}. Earn reputation by completing paid calls on open gates.`,
      });
      if (!isProbe) recordCall({ ...base, status: 403, paid: false, amountUsd: 0, platformFeeUsd: 0, sellerEarningsUsd: 0, payer: verification.payer, agentId: agent?.agentId, agentReputation: agent?.reputation, durationMs: Date.now() - started });
      return;
    }
  }

  // ── 3. SSRF guard, then proxy to the upstream API. ──
  const url = targetUrl(endpoint, req);
  try {
    await assertPublicUrl(url);
  } catch (err) {
    res.status(502).json({ error: 'Upstream blocked', detail: err instanceof Error ? err.message : String(err) });
    recordCall({ ...base, status: 502, paid: false, amountUsd: 0, platformFeeUsd: 0, sellerEarningsUsd: 0, payer: verification.payer, durationMs: Date.now() - started });
    return;
  }

  const fwdHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (typeof value === 'string') fwdHeaders[key] = value;
    else if (Array.isArray(value)) fwdHeaders[key] = value.join(', ');
  }

  const hasBody =
    Buffer.isBuffer(req.body) && req.body.length > 0 && req.method !== 'GET' && req.method !== 'HEAD';

  let upstream: globalThis.Response;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 30_000);
    upstream = await fetch(url, {
      method: req.method,
      headers: fwdHeaders,
      // Buffer is a Uint8Array at runtime (valid BodyInit); cast past DOM types.
      body: hasBody ? (new Uint8Array(req.body as Buffer) as BodyInit) : undefined,
      redirect: 'manual', // never auto-follow into a private address
      signal: ac.signal,
    }).finally(() => clearTimeout(timer));
  } catch (err) {
    res.status(502).json({ error: 'Upstream request failed', detail: err instanceof Error ? err.message : String(err) });
    recordCall({ ...base, status: 502, paid: false, amountUsd: 0, platformFeeUsd: 0, sellerEarningsUsd: 0, payer: verification.payer, durationMs: Date.now() - started });
    return;
  }

  const bodyBuf = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type');
  const cacheControl = upstream.headers.get('cache-control');

  // ── 4. Only charge for a SUCCESSFUL (2xx) delivery. ──
  const deliverable = upstream.status >= 200 && upstream.status < 300;
  if (!deliverable) {
    // Pass the upstream error back, but do not settle or charge.
    if (contentType) res.setHeader('content-type', contentType);
    res.setHeader('X-Gatekeep-Charged', '$0 (upstream not 2xx)');
    res.status(upstream.status).send(bodyBuf);
    recordCall({ ...base, status: upstream.status, paid: false, amountUsd: 0, platformFeeUsd: 0, sellerEarningsUsd: 0, payer: verification.payer, durationMs: Date.now() - started });
    return;
  }

  // ── 5. Settle the payment. If settlement fails, withhold the resource. ──
  let settlement: SettleResult;
  try {
    settlement = await settlePayment(payload, requirements);
  } catch (err) {
    settlement = {
      success: false,
      error: err instanceof Error ? err.message : 'unexpected_settle_error',
      network: requirements.network,
    };
  }
  if (!settlement.success) {
    require402(res, requirements, base, settlement.error ?? 'settlement_failed', verification.payer, true);
    return;
  }

  // ── 6. Settled → deliver the resource and book revenue. ──
  const { platformFeeUsd, sellerEarningsUsd } = splitRevenue(endpoint.priceUsd);
  if (contentType) res.setHeader('content-type', contentType);
  if (cacheControl) res.setHeader('cache-control', cacheControl);
  res.setHeader('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(settlement), 'utf8').toString('base64'));
  res.setHeader('X-Gatekeep-Charged', `$${endpoint.priceUsd}`);
  if (settlement.transaction) res.setHeader('X-Gatekeep-Tx', settlement.transaction);
  res.status(upstream.status).send(bodyBuf);

  recordCall({
    ...base,
    status: upstream.status,
    paid: true,
    amountUsd: endpoint.priceUsd,
    platformFeeUsd,
    sellerEarningsUsd,
    payer: verification.payer ?? settlement.payer,
    txHash: settlement.transaction,
    agentId: agent?.agentId,
    agentReputation: agent?.reputation,
    durationMs: Date.now() - started,
  });

  // ── 7. ERC-8004: attest the successful paid interaction → agent reputation. ──
  if (erc8004Enabled && agent) {
    void giveFeedback(agent.agentId, 100, 'payment', endpoint.name).catch(() => undefined);
  }
}

export const gatewayRouter = Router();
gatewayRouter.all('/:id', handleGateway);
gatewayRouter.all('/:id/*', handleGateway);
