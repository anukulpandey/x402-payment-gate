export interface AppConfig {
  mode: 'mock' | 'chain';
  live: boolean;
  network: string;
  publicBaseUrl: string;
  platformWallet: string;
  platformFeeBps: number;
  platformFeeRate: number;
  agentAddress: string;
  chain: { chainId: number; rpcUrl: string; usdcAddress: string } | null;
}

export interface EndpointStats {
  totalRequests: number;
  paidCalls: number;
  grossUsd: number;
  sellerEarningsUsd: number;
  platformFeeUsd: number;
  lastCallTs?: number;
}

export interface Endpoint {
  id: string;
  name: string;
  upstreamUrl: string;
  method: string;
  priceUsd: number;
  description: string;
  createdAt: number;
  active: boolean;
  gatedUrl: string;
  stats: EndpointStats;
}

export interface PlatformStats {
  endpoints: number;
  totalRequests: number;
  paidCalls: number;
  grossUsd: number;
  platformRevenueUsd: number;
  sellerPayoutUsd: number;
}

export interface CallRecord {
  id: string;
  endpointId: string;
  endpointName: string;
  ts: number;
  method: string;
  path: string;
  status: number;
  paid: boolean;
  amountUsd: number;
  platformFeeUsd: number;
  sellerEarningsUsd: number;
  payer?: string;
  txHash?: string;
  network: string;
  durationMs: number;
}

export type StepKind =
  | 'request'
  | 'quote'
  | 'sign'
  | 'pay'
  | 'settle'
  | 'deliver'
  | 'split';

export interface SimStep {
  n: number;
  title: string;
  kind: StepKind;
  detail: string;
  data?: unknown;
}

export interface SimResult {
  ok: boolean;
  mode: string;
  endpoint: { id: string; name: string; priceUsd: number };
  durationMs: number;
  steps: SimStep[];
  error?: string;
  detail?: unknown;
}

export interface NewEndpoint {
  name: string;
  upstreamUrl: string;
  method: string;
  priceUsd: number;
  description?: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  config: () => fetch('/api/config').then(json<AppConfig>),
  endpoints: () => fetch('/api/endpoints').then(json<Endpoint[]>),
  stats: () => fetch('/api/stats').then(json<PlatformStats>),
  calls: (limit = 30) => fetch(`/api/calls?limit=${limit}`).then(json<CallRecord[]>),
  create: (body: NewEndpoint) =>
    fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(json<Endpoint>),
  patch: (id: string, body: Partial<Pick<Endpoint, 'active' | 'priceUsd' | 'name' | 'description'>>) =>
    fetch(`/api/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).then(json<Endpoint>),
  remove: (id: string) =>
    fetch(`/api/endpoints/${id}`, { method: 'DELETE' }).then(json<{ deleted: boolean }>),
  simulate: (id: string) =>
    fetch(`/api/endpoints/${id}/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).then(async (res) => (await res.json()) as SimResult),
};

// ── small formatting helpers shared across components ──
export function usd(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
}

export function timeAgo(ts?: number): string {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
