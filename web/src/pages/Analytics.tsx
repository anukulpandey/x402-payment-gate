import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  usd,
  ms,
  pct,
  shortAddr,
  type AnalyticsRange,
  type AnalyticsResponse,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { Container, Card, Button, Badge, Spinner, btn, cx } from '../components/ui';
import { SignInGate } from './Dashboard';
import { AreaChart } from '../components/charts/AreaChart';
import { BarChart } from '../components/charts/BarChart';
import { RangeSwitcher } from '../components/analytics/RangeSwitcher';
import { KpiCard } from '../components/analytics/KpiCard';
import { EndpointTable } from '../components/analytics/EndpointTable';
import { AgentsLeaderboard } from '../components/analytics/AgentsLeaderboard';
import { LatencyPanel } from '../components/analytics/LatencyPanel';
import { StatusPanel } from '../components/analytics/StatusPanel';

export function Analytics() {
  const { address, loading } = useAuth();
  if (loading) {
    return (
      <Container className="grid place-items-center py-32 text-slate-400">
        <Spinner className="text-accent-300" />
      </Container>
    );
  }
  if (!address) return <SignInGate />;
  return <AnalyticsContent address={address} />;
}

const hourFmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayFmt = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

function AnalyticsContent({ address }: { address: string }) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [busy, setBusy] = useState(false);
  // Monotonic request token: only the most recently *issued* request may write
  // state, so an out-of-order poll response (old range, or pre-clear demo data)
  // can never clobber a fresher one.
  const gen = useRef(0);

  const refresh = useCallback(() => {
    const mine = ++gen.current;
    return api
      .analytics(range)
      .then((d) => {
        if (mine === gen.current) setData(d);
      })
      .catch(() => undefined); // keep the last good snapshot
  }, [range]);

  useEffect(() => {
    setData(null); // show skeleton on range change
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  async function generate() {
    setBusy(true);
    try {
      await api.generateDemoData();
      await refresh();
    } catch {
      /* surfaced by the empty state staying put */
    } finally {
      setBusy(false);
    }
  }
  async function clearDemo() {
    setBusy(true);
    try {
      await api.clearDemoData();
      await refresh();
    } catch {
      /* leave current view intact */
    } finally {
      setBusy(false);
    }
  }

  const labelFmt = data?.range === '24h' ? hourFmt : dayFmt;
  const isEmpty =
    data !== null &&
    data.totals.totalCalls.current === 0 &&
    data.series.every((b) => b.paidCalls === 0 && b.unpaidCalls === 0);

  return (
    <Container className="space-y-6 py-8">
      {/* header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Traffic &amp; revenue for <span className="font-mono text-slate-300">{shortAddr(address)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.hasDemoData && (
            <>
              <Badge tone="violet">demo data</Badge>
              <button onClick={clearDemo} disabled={busy} className={btn('ghost', 'sm')}>
                Clear
              </button>
            </>
          )}
          <RangeSwitcher value={range} onChange={setRange} />
          <Link to="/app" className={btn('ghost', 'sm')}>
            ← Dashboard
          </Link>
        </div>
      </div>

      {data === null ? (
        <PageSkeleton />
      ) : isEmpty ? (
        <EmptyState busy={busy} onGenerate={generate} />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
            <KpiCard
              label="Revenue"
              value={usd(data.totals.earningsUsd.current)}
              delta={data.totals.earningsUsd}
              spark={data.series.map((b) => b.earningsUsd)}
            />
            <KpiCard
              label="Paid calls"
              value={String(data.totals.paidCalls.current)}
              delta={data.totals.paidCalls}
              spark={data.series.map((b) => b.paidCalls)}
            />
            <KpiCard
              label="Success rate"
              value={pct(data.totals.successRatePct.current)}
              delta={data.totals.successRatePct}
              spark={data.series.map((b) => {
                const total = b.paidCalls + b.unpaidCalls;
                return total ? (b.paidCalls / total) * 100 : 0;
              })}
            />
            <KpiCard
              label="Avg latency"
              value={ms(data.totals.avgLatencyMs.current)}
              delta={data.totals.avgLatencyMs}
              spark={data.series.map((b) => b.avgLatencyMs)}
              goodWhen="down"
            />
          </div>

          {/* revenue + status */}
          <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <Card className="p-4 lg:col-span-2">
              <ChartHeader title="Revenue" sub={`your earnings per ${data.range === '24h' ? 'hour' : 'day'}`} />
              <AreaChart
                data={data.series.map((b) => ({ ts: b.ts, value: b.earningsUsd }))}
                formatValue={usd}
                formatLabel={labelFmt}
                renderTooltip={(d, i) => {
                  const b = data.series[i];
                  return (
                    <div className="space-y-0.5">
                      <div className="text-slate-400">{labelFmt(d.ts)}</div>
                      <Row k="You earn" v={usd(b.earningsUsd)} strong />
                      <Row k="Gross" v={usd(b.grossUsd)} />
                      <Row k="Fee" v={usd(b.feeUsd)} />
                    </div>
                  );
                }}
              />
            </Card>
            <StatusPanel statusCodes={data.statusCodes} />
          </div>

          {/* calls + latency */}
          <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <Card className="p-4 lg:col-span-2">
              <ChartHeader title="Calls" sub="paid vs unpaid attempts" />
              <BarChart
                data={data.series.map((b) => ({ ts: b.ts, values: [b.paidCalls, b.unpaidCalls] }))}
                colors={['var(--color-accent-500)', 'rgba(148,163,184,0.35)']}
                labels={['Paid', 'Unpaid']}
                formatLabel={labelFmt}
              />
            </Card>
            <LatencyPanel latency={data.latency} />
          </div>

          {/* endpoints + agents */}
          <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
            <div className="lg:col-span-2">
              <EndpointTable rows={data.endpoints} />
            </div>
            <AgentsLeaderboard agents={data.agents} />
          </div>

          {data.sampleTruncated && (
            <p className="text-[11px] text-slate-500">
              Analytics reflect the 2,000 most recent calls; older activity may be excluded.
            </p>
          )}
        </>
      )}
    </Container>
  );
}

function ChartHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between px-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className={cx('font-mono', strong ? 'text-white' : 'text-slate-300')}>{v}</span>
    </div>
  );
}

function PageSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-white/5';
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cx(block, 'h-[118px]')} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className={cx(block, 'h-[280px] lg:col-span-2')} />
        <div className={cx(block, 'h-[280px]')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className={cx(block, 'h-[280px] lg:col-span-2')} />
        <div className={cx(block, 'h-[280px]')} />
      </div>
    </div>
  );
}

function EmptyState({ busy, onGenerate }: { busy: boolean; onGenerate: () => void }) {
  return (
    <Card className="px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-500/10 text-2xl">📊</div>
      <h2 className="mt-5 text-xl font-semibold text-white">No traffic in this period</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
        Charts light up as agents pay your gates. Generate 30 days of sample traffic to explore the
        analytics — it&apos;s flagged as demo data, never counts toward withdrawals, and can be cleared
        with one click.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={onGenerate} loading={busy}>
          Generate sample traffic
        </Button>
        <Link to="/app" className={btn('ghost', 'sm')}>
          or run the agent from your dashboard →
        </Link>
      </div>
    </Card>
  );
}
