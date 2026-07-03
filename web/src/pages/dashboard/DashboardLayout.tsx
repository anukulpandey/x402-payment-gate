import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { DashboardProvider, useDashboard } from '../../lib/dashboard';
import { shortAddr } from '../../lib/api';
import { Container, Card, Badge, Spinner, btn, cx } from '../../components/ui';
import { WalletButton } from '../../components/WalletButton';

const TABS = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/gates', label: 'Gates', end: false },
  { to: '/app/payouts', label: 'Payouts', end: false },
  { to: '/app/activity', label: 'Activity', end: false },
  { to: '/app/analytics', label: 'Analytics', end: false },
];

/** Auth gate + shared data provider + persistent header/tab-bar for all of /app. */
export function DashboardLayout() {
  const { address, loading } = useAuth();

  if (loading) {
    return (
      <Container className="grid place-items-center py-32 text-slate-400">
        <Spinner className="text-accent-300" />
      </Container>
    );
  }
  if (!address) return <SignInGate />;

  return (
    <DashboardProvider address={address}>
      <Container className="space-y-6 py-8">
        <DashboardHeader />
        <TabBar />
        <Outlet />
      </Container>
    </DashboardProvider>
  );
}

function DashboardHeader() {
  const { address, network, onFuji, hasProvider, ensureFuji } = useDashboard();
  return (
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
        {!onFuji && hasProvider && (
          <button onClick={ensureFuji} className={btn('ghost', 'sm')}>
            Switch to Fuji
          </button>
        )}
        <WalletButton size="sm" />
      </div>
    </div>
  );
}

function TabBar() {
  return (
    <div className="-mx-1 overflow-x-auto">
      <nav className="inline-flex min-w-full gap-1 border-b border-white/8 px-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border-accent-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Shown when no wallet is connected. Exported for anywhere that needs the gate. */
export function SignInGate() {
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
