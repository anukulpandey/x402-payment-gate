import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type AppConfig,
  type CallRecord,
  type Endpoint,
  type PlatformStats,
} from './api';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { GateForm } from './components/GateForm';
import { EndpointCard } from './components/EndpointCard';
import { CallFeed } from './components/CallFeed';
import { Playground } from './components/Playground';
import { Card } from './components/ui';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [playing, setPlaying] = useState<Endpoint | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [eps, st, cl] = await Promise.all([api.endpoints(), api.stats(), api.calls(30)]);
      setEndpoints(eps);
      setStats(st);
      setCalls(cl);
      setLoaded(true);
    } catch {
      /* transient — keep last good state */
    }
  }, []);

  useEffect(() => {
    api.config().then(setConfig).catch(() => undefined);
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-full">
      <Header config={config} />

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <StatsBar stats={stats} />

        <GateForm onCreated={() => refresh()} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Your gated APIs
              </h2>
              <span className="text-xs text-slate-500">{endpoints.length} live</span>
            </div>

            {loaded && endpoints.length === 0 ? (
              <Card className="px-5 py-10 text-center text-sm text-slate-500">
                No gated APIs yet — create one above to get a pay-per-call URL.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {endpoints.map((e) => (
                  <EndpointCard key={e.id} endpoint={e} onRun={setPlaying} onChanged={refresh} />
                ))}
              </div>
            )}
          </section>

          <aside className="lg:col-span-1">
            <CallFeed calls={calls} />
          </aside>
        </div>

        <HowItWorks />
      </main>

      {playing && (
        <Playground endpoint={playing} onClose={() => setPlaying(null)} onDone={refresh} />
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', t: 'Paste & price', d: 'Drop in any REST endpoint and set a price-per-call.' },
    { n: '02', t: 'Get a gated URL', d: 'GateKeep returns an x402-wrapped URL agents can hit.' },
    { n: '03', t: 'Agent auto-pays', d: '402 → agent signs a USDC payment → request is unlocked.' },
    { n: '04', t: 'You take a cut', d: 'Every settled call splits revenue to you and the seller.' },
  ];
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        How it works
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="relative">
            <div className="font-mono text-xs text-accent-400">{s.n}</div>
            <div className="mt-1 text-sm font-semibold text-white">{s.t}</div>
            <div className="mt-0.5 text-xs text-slate-400">{s.d}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
