import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, type CallRecord, type Endpoint, type SellerStats, type Withdrawal } from './api';
import { useWallet } from './wallet';

/**
 * Shared state for the whole /app dashboard shell. One 5s poll of
 * endpoints/stats/calls/withdrawals lives here (instead of each tab polling
 * separately), exposed to every tab via `useDashboard()`.
 */
export interface DashboardState {
  address: string;
  endpoints: Endpoint[];
  stats: SellerStats | null;
  calls: CallRecord[];
  withdrawals: Withdrawal[];
  erc8004: boolean;
  live: boolean;
  /** "avalanche-fuji · 43113" in chain mode, "demo mode" otherwise. */
  network: string;
  onFuji: boolean;
  hasProvider: boolean;
  loaded: boolean;
  refresh: () => void;
  ensureFuji: () => void;
}

const Ctx = createContext<DashboardState | null>(null);

export function useDashboard(): DashboardState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDashboard must be used within a DashboardProvider');
  return v;
}

export function DashboardProvider({ address, children }: { address: string; children: ReactNode }) {
  const wallet = useWallet();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [erc8004, setErc8004] = useState(false);
  const [live, setLive] = useState(false);
  const [network, setNetwork] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    // Errors keep the last good snapshot (a transient poll failure shouldn't blank the UI).
    Promise.all([api.endpoints(), api.stats(), api.calls(50), api.withdrawals()])
      .then(([e, s, c, w]) => {
        setEndpoints(e);
        setStats(s);
        setCalls(c);
        setWithdrawals(w);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    api
      .config()
      .then((c) => {
        setLive(c.live);
        setNetwork(c.live ? `${c.network} · ${c.chainId}` : 'demo mode');
        setErc8004(!!c.erc8004);
      })
      .catch(() => undefined);
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const ensureFuji = useCallback(() => {
    void wallet.ensureChain(43113).catch(() => undefined);
  }, [wallet]);

  const value: DashboardState = {
    address,
    endpoints,
    stats,
    calls,
    withdrawals,
    erc8004,
    live,
    network,
    onFuji: wallet.chainId === 43113,
    hasProvider: wallet.hasProvider,
    loaded,
    refresh,
    ensureFuji,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
