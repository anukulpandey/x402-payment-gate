import { useCallback, useEffect, useState } from 'react';
import { api, shortAddr, type CallRecord, type Endpoint, type SellerStats } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useWallet } from '../lib/wallet';
import { Container, Card, Button, Badge, Spinner, btn } from '../components/ui';
import { WalletButton } from '../components/WalletButton';
import { StatsBar } from '../components/StatsBar';
import { PayoutsCard } from '../components/PayoutsCard';
import { GateForm } from '../components/GateForm';
import { EndpointCard } from '../components/EndpointCard';
import { CallFeed } from '../components/CallFeed';
import { Playground } from '../components/Playground';

export function Dashboard() {
  const { address, loading } = useAuth();

  if (loading) {
    return (
      <Container className="grid place-items-center py-32 text-slate-400">
        <Spinner className="text-accent-300" />
      </Container>
    );
  }
  if (!address) return <SignInGate />;
  return <DashboardContent address={address} />;
}

function SignInGate() {
  const { error, signingIn } = useAuth();
  return (
    <Container className="py-20">
      <Card className="mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-500/10 text-2xl">🔐</div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Connect your wallet</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Sign in with MetaMask to manage your gated APIs and track earnings. Your wallet is your account —
          no email, no password. Signing is free and gasless.
        </p>
        <div className="mt-6 flex justify-center">
          <WalletButton />
        </div>
        {error && !signingIn && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-xs text-slate-400">
          {['Gate unlimited endpoints', 'Get paid in USDC to this wallet', 'Watch agents pay in real time'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> {t}
            </li>
          ))}
        </ul>
      </Card>
    </Container>
  );
}

function DashboardContent({ address }: { address: string }) {
  const wallet = useWallet();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [playing, setPlaying] = useState<Endpoint | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [network, setNetwork] = useState<string>('');

  const refresh = useCallback(async () => {
    try {
      const [eps, st, cl] = await Promise.all([api.endpoints(), api.stats(), api.calls(30)]);
      setEndpoints(eps);
      setStats(st);
      setCalls(cl);
      setLoaded(true);
    } catch {
      /* keep last good state */
    }
  }, []);

  useEffect(() => {
    api.config().then((c) => setNetwork(c.live ? `${c.network} · ${c.chainId}` : 'demo mode')).catch(() => undefined);
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [refresh]);

  async function loadExamples() {
    setLoadingExamples(true);
    try {
      await api.loadExamples();
      await refresh();
    } finally {
      setLoadingExamples(false);
    }
  }

  const onFuji = wallet.chainId === 43113;

  return (
    <Container className="space-y-6 py-8">
      {/* header */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Your dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Earnings settle to <span className="font-mono text-slate-300">{shortAddr(address)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={network.includes('demo') ? 'violet' : 'green'}>
            <span className={network.includes('demo') ? 'text-accent-300' : 'text-emerald-400'}>●</span>
            {network || '…'}
          </Badge>
          {!onFuji && wallet.hasProvider && (
            <button onClick={() => wallet.ensureChain(43113).catch(() => undefined)} className={btn('ghost', 'sm')}>
              Switch to Fuji
            </button>
          )}
        </div>
      </div>

      <StatsBar stats={stats} />

      <PayoutsCard stats={stats} address={address} onWithdrawn={refresh} />

      <GateForm onCreated={refresh} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your gated APIs</h2>
            <span className="text-xs text-slate-500">{endpoints.length} live</span>
          </div>

          {loaded && endpoints.length === 0 ? (
            <Card className="px-6 py-12 text-center">
              <div className="text-3xl">🚪</div>
              <h3 className="mt-3 text-base font-semibold text-white">No gated APIs yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Create one above with your own endpoint, or load a few examples to see it in action.
              </p>
              <div className="mt-4">
                <Button variant="secondary" loading={loadingExamples} onClick={loadExamples}>
                  Load example endpoints
                </Button>
              </div>
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

      {playing && <Playground endpoint={playing} onClose={() => setPlaying(null)} onDone={refresh} />}
    </Container>
  );
}
