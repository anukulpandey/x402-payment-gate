import 'dotenv/config';

/**
 * Settlement modes:
 *  - "mock"  : offline. Real EIP-712 signing + real signature verification, but
 *              settlement is simulated (no chain). Zero setup.
 *  - "chain" : real on-chain settlement of an EIP-3009 USDC transfer via a
 *              GateKeep-run facilitator. Works against any EVM RPC — Avalanche
 *              Fuji out of the box (see `.env.fuji` / `npm run fuji:setup`).
 */
export type SettlementMode = 'mock' | 'chain';

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

// A public, well-known test private key — used ONLY for offline mock-mode
// signing. It never holds real funds. Chain mode supplies real keys via env.
const DEMO_SIGNING_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const DEFAULT_JWT_SECRET = 'gatekeep-dev-secret-change-in-production';

const port = parseInt(env('PORT', '4021'), 10);
const mode = env('X402_MODE', 'mock') as SettlementMode;

export const config = {
  port,
  /** Public origin where gated URLs live (must be reachable by paying agents). */
  publicBaseUrl: env('PUBLIC_BASE_URL', `http://localhost:${port}`),
  mode,
  /** Payment network — a cosmetic x402 network label for the dashboard. */
  network: env('X402_NETWORK', mode === 'chain' ? 'avalanche-fuji' : 'base-sepolia'),
  /** Platform's USDC receiving address (every agent payment lands here). */
  platformWallet: env('PLATFORM_WALLET', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'),
  /** Platform wallet key — signs seller payout (withdrawal) transfers in chain mode. */
  platformPrivateKey: env('PLATFORM_PRIVATE_KEY', '') as `0x${string}` | '',
  /** Secret for signing session JWTs. CHANGE IN PRODUCTION. */
  jwtSecret: env('JWT_SECRET', DEFAULT_JWT_SECRET),
  /** Platform take rate in basis points (1000 = 10%). */
  platformFeeBps: parseInt(env('PLATFORM_FEE_BPS', '1000'), 10),
  /** The paying demo agent. In chain mode this account must hold USDC. */
  agentPrivateKey: env('AGENT_PRIVATE_KEY', DEMO_SIGNING_KEY) as `0x${string}`,
  dataDir: env('DATA_DIR', 'data'),

  // ── persistence ──
  // When these are set (e.g. on Vercel / any serverless host) the store keeps
  // its data in Upstash Redis instead of a local JSON file, so it survives
  // across stateless invocations. Unset → local file store (`data/db.json`).
  // Accept either the Upstash names or the names Vercel's Marketplace
  // integration injects (KV_REST_API_*), so it works however Redis was added.
  redisUrl: env('UPSTASH_REDIS_REST_URL', env('KV_REST_API_URL', '')),
  redisToken: env('UPSTASH_REDIS_REST_TOKEN', env('KV_REST_API_TOKEN', '')),

  // ── chain-mode settings (ignored in mock mode) ──
  /** EVM JSON-RPC endpoint. Defaults to Avalanche Fuji. */
  rpcUrl: env('RPC_URL', 'https://api.avax-test.network/ext/bc/C/rpc'),
  /** Chain id for the EIP-712 domain (must match the RPC's chain). Fuji = 43113. */
  chainId: parseInt(env('CHAIN_ID', '43113'), 10),
  /** EIP-3009 USDC token to settle in. Set by `npm run fuji:deploy`. */
  usdcAddress: env('USDC_ADDRESS', '') as `0x${string}`,
  usdcName: env('USDC_NAME', 'USD Coin'),
  usdcVersion: env('USDC_VERSION', '2'),
  usdcDecimals: parseInt(env('USDC_DECIMALS', '6'), 10),
  /** Facilitator wallet — submits settlement txs and pays gas. */
  facilitatorPrivateKey: env('FACILITATOR_PRIVATE_KEY', DEMO_SIGNING_KEY) as `0x${string}`,

  // ── ERC-8004 trustless-agents registries (chain mode). Set by deploy:erc8004. ──
  identityRegistry: env('IDENTITY_REGISTRY', '') as `0x${string}` | '',
  reputationRegistry: env('REPUTATION_REGISTRY', '') as `0x${string}` | '',
};

/** True when settlement actually hits a blockchain. */
export const isLive = config.mode === 'chain';

// Never ship sessions signed with the public default secret.
if (config.jwtSecret === DEFAULT_JWT_SECRET) {
  if (isLive) {
    // Chain mode moves real USDC — a forgeable session is impersonation of a
    // seller's payout account. Fail fast regardless of NODE_ENV (some hosts
    // don't set it to 'production').
    throw new Error('[gatekeep] JWT_SECRET is still the default in a chain-mode deployment. Set JWT_SECRET.');
  }
  if (process.env.NODE_ENV === 'production') {
    // Mock mode holds no real funds, but a public demo still shouldn't use the
    // well-known default (sessions would be forgeable).
    console.warn('[gatekeep] ⚠️  JWT_SECRET is the default — set it in production to prevent session forgery.');
  }
}

/** True when ERC-8004 identity/reputation features are available. */
export const erc8004Enabled =
  isLive && !!config.identityRegistry && !!config.reputationRegistry;

/** Platform fee as a fraction (0.10 for 10%). */
export const platformFeeRate = config.platformFeeBps / 10_000;
