export interface AppConfig {
  mode: 'mock' | 'chain';
  live: boolean;
  network: string;
  chainId: number;
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
  earningsUsd: number;
  feeUsd: number;
  lastCallTs?: number;
}

export interface Endpoint {
  id: string;
  ownerAddress: string;
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

export interface SellerStats {
  endpoints: number;
  totalRequests: number;
  paidCalls: number;
  grossUsd: number;
  earningsUsd: number;
  feeUsd: number;
}

export interface CallRecord {
  id: string;
  endpointId: string;
  ownerAddress: string;
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

export type StepKind = 'request' | 'quote' | 'sign' | 'pay' | 'settle' | 'deliver' | 'split';
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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error((body as { error?: string }).error || `${res.status} ${res.statusText}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}
const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  // auth (SIWE)
  config: () => req<AppConfig>('/api/config'),
  me: () => req<{ address: string | null }>('/api/auth/me'),
  nonce: (address: string) => req<{ message: string }>('/api/auth/nonce', jsonInit('POST', { address })),
  verify: (message: string, signature: string) =>
    req<{ address: string }>('/api/auth/verify', jsonInit('POST', { message, signature })),
  logout: () => req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // seller resources
  endpoints: () => req<Endpoint[]>('/api/endpoints'),
  stats: () => req<SellerStats>('/api/stats'),
  calls: (limit = 30) => req<CallRecord[]>(`/api/calls?limit=${limit}`),
  loadExamples: () => req<{ added: number; endpoints: Endpoint[] }>('/api/examples', jsonInit('POST', {})),
  create: (body: NewEndpoint) => req<Endpoint>('/api/endpoints', jsonInit('POST', body)),
  patch: (id: string, body: Partial<Pick<Endpoint, 'active' | 'priceUsd' | 'name' | 'description'>>) =>
    req<Endpoint>(`/api/endpoints/${id}`, jsonInit('PATCH', body)),
  remove: (id: string) => req<{ deleted: boolean }>(`/api/endpoints/${id}`, { method: 'DELETE' }),
  simulate: (id: string) =>
    fetch(`/api/endpoints/${id}/simulate`, { credentials: 'include', ...jsonInit('POST', {}) }).then(
      (r) => r.json() as Promise<SimResult>,
    ),
};

// ── formatting helpers ──
export function usd(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}
export function shortAddr(a?: string | null): string {
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
