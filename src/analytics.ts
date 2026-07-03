import { round6 } from './revenue.js';
import type { CallRecord, GatedEndpoint } from './types.js';

// Pure aggregation over the in-memory call ledger. No store, no express —
// keeps it trivially unit-testable and lets the route stay a thin wrapper.
// Shapes here are a wire contract mirrored by the frontend; change with care.

export type AnalyticsRange = '24h' | '7d' | '30d';

/** One time-series bucket (hourly for 24h, daily for 7d/30d). */
export interface AnalyticsBucket {
  ts: number;
  grossUsd: number;
  feeUsd: number;
  earningsUsd: number;
  paidCalls: number;
  unpaidCalls: number;
  avgLatencyMs: number;
}

/** Current-window value vs the previous window of equal length. */
export interface DeltaStat {
  current: number;
  previous: number;
  /** Percent change, 1 decimal. null = "new" (previous was 0 but current isn't). */
  deltaPct: number | null;
}

export interface AnalyticsTotals {
  grossUsd: DeltaStat;
  earningsUsd: DeltaStat;
  feeUsd: DeltaStat;
  paidCalls: DeltaStat;
  totalCalls: DeltaStat;
  successRatePct: DeltaStat;
  avgLatencyMs: DeltaStat;
}

export interface EndpointBreakdownRow {
  endpointId: string;
  name: string;
  active: boolean;
  priceUsd: number;
  calls: number;
  paidCalls: number;
  grossUsd: number;
  earningsUsd: number;
  avgLatencyMs: number;
  errorRatePct: number;
  revenueSharePct: number;
}

export interface AgentRow {
  payer: string;
  agentId?: number;
  agentReputation?: number;
  calls: number;
  spendUsd: number;
  lastTs: number;
  demo: boolean;
}

export interface LatencyStats {
  p50: number;
  p95: number;
  avg: number;
  max: number;
  count: number;
}

export interface AnalyticsResponse {
  range: AnalyticsRange;
  bucketMs: number;
  from: number;
  to: number;
  generatedAt: number;
  series: AnalyticsBucket[];
  totals: AnalyticsTotals;
  endpoints: EndpointBreakdownRow[];
  agents: AgentRow[];
  latency: LatencyStats;
  statusCodes: { status: number; count: number }[];
  /** True when the ledger cap likely ate calls the window should have seen. */
  sampleTruncated: boolean;
  hasDemoData: boolean;
}

const RANGES: Record<AnalyticsRange, { bucketMs: number; buckets: number }> = {
  '24h': { bucketMs: 3_600_000, buckets: 24 },
  '7d': { bucketMs: 86_400_000, buckets: 7 },
  '30d': { bucketMs: 86_400_000, buckets: 30 },
};

function deltaStat(current: number, previous: number): DeltaStat {
  // previous of 0 makes percent change meaningless: null flags "new" growth,
  // 0 means genuinely flat at zero.
  const deltaPct =
    previous > 0
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : current > 0
        ? null
        : 0;
  return { current, previous, deltaPct };
}

/** Nearest-rank percentile over an ascending-sorted array. 0 when empty. */
function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(q * (sorted.length - 1))];
}

export function computeAnalytics(
  input: { calls: CallRecord[]; endpoints: GatedEndpoint[]; ledgerAtCap: boolean },
  range: AnalyticsRange,
  now: number = Date.now(),
): AnalyticsResponse {
  const { bucketMs, buckets } = RANGES[range];
  const span = bucketMs * buckets;

  // Series buckets snap to bucket boundaries so the chart's x-axis is stable
  // across refreshes. Daily buckets land on UTC midnight (epoch math), not the
  // viewer's local midnight — the frontend labels them accordingly.
  const lastStart = Math.floor(now / bucketMs) * bucketMs;
  const firstStart = lastStart - (buckets - 1) * bucketMs;

  const series: AnalyticsBucket[] = [];
  const latSums = new Array<number>(buckets).fill(0);
  const latCounts = new Array<number>(buckets).fill(0);
  for (let i = 0; i < buckets; i++) {
    series.push({
      ts: firstStart + i * bucketMs,
      grossUsd: 0,
      feeUsd: 0,
      earningsUsd: 0,
      paidCalls: 0,
      unpaidCalls: 0,
      avgLatencyMs: 0,
    });
  }

  // Totals/deltas use exact rolling windows ending at `now` (NOT bucket-aligned):
  // a partial trailing bucket would otherwise make every delta look like a dip.
  const curFrom = now - span; // exclusive lower bound of the current window
  const prevFrom = now - 2 * span;

  let curGross = 0, curFee = 0, curEarn = 0, curPaid = 0, curTotal = 0, curLatSum = 0;
  let prevGross = 0, prevPaid = 0, prevTotal = 0, prevLatSum = 0;
  let prevFee = 0, prevEarn = 0;

  const currentCalls: CallRecord[] = [];
  let minTs = Infinity;
  let hasDemoData = false;

  // Single pass: never assume the ledger is sorted.
  for (const c of input.calls) {
    if (c.ts < minTs) minTs = c.ts;
    if (c.demo) hasDemoData = true; // any age counts, not just the window

    if (c.ts >= firstStart && c.ts <= now) {
      // Clamp to the last bucket: the trailing bucket is still filling.
      const idx = Math.min(buckets - 1, Math.floor((c.ts - firstStart) / bucketMs));
      const b = series[idx];
      if (c.paid) {
        b.grossUsd += c.amountUsd;
        b.feeUsd += c.platformFeeUsd;
        b.earningsUsd += c.sellerEarningsUsd;
        b.paidCalls++;
      } else {
        b.unpaidCalls++;
      }
      // Latency is over ALL calls in the bucket, paid or not.
      latSums[idx] += c.durationMs;
      latCounts[idx]++;
    }

    if (c.ts > curFrom && c.ts <= now) {
      currentCalls.push(c);
      curTotal++;
      curLatSum += c.durationMs;
      if (c.paid) {
        curPaid++;
        curGross += c.amountUsd;
        curFee += c.platformFeeUsd;
        curEarn += c.sellerEarningsUsd;
      }
    } else if (c.ts > prevFrom && c.ts <= curFrom) {
      prevTotal++;
      prevLatSum += c.durationMs;
      if (c.paid) {
        prevPaid++;
        prevGross += c.amountUsd;
        prevFee += c.platformFeeUsd;
        prevEarn += c.sellerEarningsUsd;
      }
    }
  }

  // Round USD once per bucket at the end — accumulating rounded floats drifts.
  for (let i = 0; i < buckets; i++) {
    const b = series[i];
    b.grossUsd = round6(b.grossUsd);
    b.feeUsd = round6(b.feeUsd);
    b.earningsUsd = round6(b.earningsUsd);
    b.avgLatencyMs = latCounts[i] ? Math.round(latSums[i] / latCounts[i]) : 0;
  }

  // Ratio stats: compute per-window ratio first, then delta the ratios —
  // deltaing raw sums would conflate traffic growth with rate changes.
  const curSuccess = curTotal ? Math.round((curPaid / curTotal) * 1000) / 10 : 0;
  const prevSuccess = prevTotal ? Math.round((prevPaid / prevTotal) * 1000) / 10 : 0;
  const curAvgLat = curTotal ? Math.round(curLatSum / curTotal) : 0;
  const prevAvgLat = prevTotal ? Math.round(prevLatSum / prevTotal) : 0;

  const totals: AnalyticsTotals = {
    grossUsd: deltaStat(round6(curGross), round6(prevGross)),
    earningsUsd: deltaStat(round6(curEarn), round6(prevEarn)),
    feeUsd: deltaStat(round6(curFee), round6(prevFee)),
    paidCalls: deltaStat(curPaid, prevPaid),
    totalCalls: deltaStat(curTotal, prevTotal),
    successRatePct: deltaStat(curSuccess, prevSuccess),
    avgLatencyMs: deltaStat(curAvgLat, prevAvgLat),
  };

  const durations = currentCalls.map((c) => c.durationMs).sort((a, b) => a - b);
  const latency: LatencyStats = {
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    avg: curAvgLat,
    max: durations.length ? durations[durations.length - 1] : 0,
    count: durations.length,
  };

  // Per-endpoint breakdown. Iterate the gate list (not the calls) so
  // zero-traffic gates still show up as rows in the dashboard.
  const epAcc = new Map<
    string,
    { calls: number; paidCalls: number; grossUsd: number; earningsUsd: number; latSum: number }
  >();
  for (const c of currentCalls) {
    let acc = epAcc.get(c.endpointId);
    if (!acc) {
      acc = { calls: 0, paidCalls: 0, grossUsd: 0, earningsUsd: 0, latSum: 0 };
      epAcc.set(c.endpointId, acc);
    }
    acc.calls++;
    acc.latSum += c.durationMs;
    if (c.paid) {
      acc.paidCalls++;
      acc.grossUsd += c.amountUsd;
      acc.earningsUsd += c.sellerEarningsUsd;
    }
  }
  const endpoints: EndpointBreakdownRow[] = input.endpoints.map((e) => {
    const acc = epAcc.get(e.id);
    const calls = acc?.calls ?? 0;
    const paidCalls = acc?.paidCalls ?? 0;
    const grossUsd = round6(acc?.grossUsd ?? 0);
    return {
      endpointId: e.id,
      name: e.name,
      active: e.active,
      priceUsd: e.priceUsd,
      calls,
      paidCalls,
      grossUsd,
      earningsUsd: round6(acc?.earningsUsd ?? 0),
      avgLatencyMs: calls ? Math.round((acc?.latSum ?? 0) / calls) : 0,
      errorRatePct: calls ? Math.round(((calls - paidCalls) / calls) * 1000) / 10 : 0,
      revenueSharePct: curGross > 0 ? Math.round((grossUsd / curGross) * 1000) / 10 : 0,
    };
  });
  endpoints.sort((a, b) => b.grossUsd - a.grossUsd || b.calls - a.calls);

  // Top paying agents in the current window, grouped by payer address.
  const agentAcc = new Map<string, AgentRow>();
  for (const c of currentCalls) {
    if (!c.paid) continue;
    const key = c.payer ?? 'unknown';
    let a = agentAcc.get(key);
    if (!a) {
      a = { payer: key, calls: 0, spendUsd: 0, lastTs: 0, demo: false };
      agentAcc.set(key, a);
    }
    a.calls++;
    a.spendUsd += c.amountUsd;
    if (c.demo) a.demo = true;
    // Identity fields come from the newest call — reputation moves over time.
    if (c.ts >= a.lastTs) {
      a.lastTs = c.ts;
      a.agentId = c.agentId;
      a.agentReputation = c.agentReputation;
    }
  }
  const agents: AgentRow[] = [...agentAcc.values()]
    .map((a) => ({ ...a, spendUsd: round6(a.spendUsd) }))
    .sort((a, b) => b.spendUsd - a.spendUsd)
    .slice(0, 8);

  const statusMap = new Map<number, number>();
  for (const c of currentCalls) {
    statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
  }
  const statusCodes = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // If the capped ledger's oldest record is newer than the comparison window,
  // older calls were evicted and the "previous" numbers understate reality.
  const sampleTruncated =
    input.ledgerAtCap && input.calls.length > 0 && minTs > now - 2 * span;

  return {
    range,
    bucketMs,
    from: firstStart,
    to: now,
    generatedAt: now,
    series,
    totals,
    endpoints,
    agents,
    latency,
    statusCodes,
    sampleTruncated,
    hasDemoData,
  };
}
