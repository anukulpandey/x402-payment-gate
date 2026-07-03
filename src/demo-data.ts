import { nanoid } from 'nanoid';
import { splitRevenue } from './revenue.js';
import type { CallRecord, GatedEndpoint } from './types.js';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const DAYS = 30;

/** CallRecord in types.ts has no demo flag yet; widen locally instead of touching it. */
type DemoCallRecord = CallRecord & { demo: true };

interface DemoPayer {
  address: string;
  /** Relative share of demo traffic this payer generates. */
  weight: number;
  /** ERC-8004 identity — only the first four payers are "registered" agents. */
  agentId?: number;
  agentReputation?: number;
}

/** Fixed fake wallets so the same repeat agents show up on every regeneration. */
const PAYERS: DemoPayer[] = [
  { address: '0x7ac9385a9e821bdf5eefdf0393f06aa844b5a1ec', weight: 0.3, agentId: 1001, agentReputation: 87 },
  { address: '0x1f8e2b4c6d0a9e3f5b7c1d2e4a6b8c0d2e4f6a1b', weight: 0.22, agentId: 1002, agentReputation: 61 },
  { address: '0x93bd4e7a2c5f8b1d6e9a0c3f7b2d5e8a1c4f6b3d', weight: 0.18, agentId: 1003, agentReputation: 34 },
  { address: '0x5e2d8f1a4b7c0e3d6a9f2b5c8e1d4a7f0b3c6e9d', weight: 0.14, agentId: 1004, agentReputation: 12 },
  { address: '0xc41a7d3e9f2b6c8a0d5e1f4b7a3c9e2d6f8b0a4c', weight: 0.09 },
  { address: '0x2b6e9c1f4a7d0b3e8c5f2a9d6b1e4c7f0a3d8b5e', weight: 0.07 },
];

/** Turn raw weights into a cumulative distribution (last entry = 1). */
function cumulate(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return weights.map((w) => (acc += w / total));
}

/** Sample an index from a cumulative distribution. */
function pickIndex(cumulative: number[]): number {
  const r = Math.random();
  for (let i = 0; i < cumulative.length; i++) {
    if (r < cumulative[i]) return i;
  }
  return cumulative.length - 1;
}

/** In-place Fisher–Yates shuffle. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a synthetic 30-day call ledger for the given endpoints.
 * Shaped like real traffic — upward daily trend with a weekly wave, skewed
 * endpoint popularity, ~78% paid, long-tail latency — so charts demo well.
 * Every record is flagged demo: true and never carries a txHash.
 */
export function generateDemoCalls(endpoints: GatedEndpoint[], now = Date.now()): CallRecord[] {
  if (endpoints.length === 0) return [];

  const n = 150 + Math.floor(Math.random() * 150);

  // Day weights for d = 0 (oldest) … 29 (today): growth trend + weekly wave.
  const dayWeights: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    dayWeights.push((0.5 + d / 29) * (1 + 0.25 * Math.sin((d / 7) * 2 * Math.PI)));
  }
  const dayCum = cumulate(dayWeights);

  // Skewed popularity, shuffled so the "hot" endpoint isn't always the first one created.
  const endpointCum = cumulate(shuffle(endpoints.map((_, i) => 1 / (i + 1))));
  const payerCum = cumulate(PAYERS.map((p) => p.weight));

  // Fixed per-endpoint latency base so each endpoint keeps a consistent perf profile.
  const latencyBase = new Map<string, number>();
  for (const ep of endpoints) latencyBase.set(ep.id, 120 + Math.random() * 480);

  const records: DemoCallRecord[] = [];
  for (let i = 0; i < n; i++) {
    const endpoint = endpoints[pickIndex(endpointCum)];

    // Day d spans [now - (30 - d) days, now - (29 - d) days]; uniform inside it.
    const d = pickIndex(dayCum);
    const ts = Math.min(now, now - (DAYS - d) * DAY_MS + Math.random() * DAY_MS);

    // Outcome mix: 78% paid 200, then 402/403/500/502 at 12/4/3/3.
    const roll = Math.random();
    const status = roll < 0.78 ? 200 : roll < 0.9 ? 402 : roll < 0.94 ? 403 : roll < 0.97 ? 500 : 502;
    const paid = status === 200;

    const { platformFeeUsd, sellerEarningsUsd } = paid
      ? splitRevenue(endpoint.priceUsd)
      : { platformFeeUsd: 0, sellerEarningsUsd: 0 };

    let durationMs = Math.round((latencyBase.get(endpoint.id) ?? 300) * (0.6 + Math.random() * 1.4));
    if (Math.random() < 0.05) durationMs *= 4; // p95 outliers

    const record: DemoCallRecord = {
      id: nanoid(10),
      endpointId: endpoint.id,
      ownerAddress: endpoint.ownerAddress,
      endpointName: endpoint.name,
      ts,
      method: endpoint.method === 'ANY' ? 'GET' : endpoint.method,
      path: '/g/' + endpoint.id,
      status,
      paid,
      amountUsd: paid ? endpoint.priceUsd : 0,
      platformFeeUsd,
      sellerEarningsUsd,
      network: 'demo',
      demo: true,
      durationMs,
    };

    // Paid calls always identify a payer; 403s imply an identified-but-rejected
    // agent; 402s only sometimes reveal one. 5xx callers stay anonymous.
    const hasPayer = paid || status === 403 || (status === 402 && Math.random() < 0.6);
    if (hasPayer) {
      const payer = PAYERS[pickIndex(payerCum)];
      record.payer = payer.address;
      if (payer.agentId !== undefined) {
        record.agentId = payer.agentId;
        record.agentReputation = payer.agentReputation;
      }
    }

    records.push(record);
  }

  // Re-stamp the newest ~15% into the last 24h (and 3 into the last hour) so
  // the dashboard's 24h view always has something to show right after seeding.
  records.sort((a, b) => b.ts - a.ts);
  const recent = Math.ceil(n * 0.15);
  for (let i = 0; i < recent && i < records.length; i++) {
    records[i].ts = now - Math.random() * DAY_MS;
  }
  for (let i = 0; i < 3 && i < records.length; i++) {
    records[i].ts = now - Math.random() * HOUR_MS;
  }

  // Newest first — matches the ledger invariant.
  records.sort((a, b) => b.ts - a.ts);
  return records;
}
