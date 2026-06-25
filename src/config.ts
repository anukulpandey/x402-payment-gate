import 'dotenv/config';

/**
 * Settlement modes:
 *  - "mock"  : offline. Real EIP-712 signing + real signature verification, but
 *              settlement is simulated (no chain). Zero setup.
 *  - "chain" : real on-chain settlement of an EIP-3009 USDC transfer via a
 *              GateKeep-run facilitator wallet. Works against ANY EVM RPC —
 *              local Anvil for the demo, or Avalanche / Base in production.
 */
export type SettlementMode = 'mock' | 'chain';

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

// Well-known Anvil/Hardhat test accounts (PUBLIC keys — testnets only).
const ANVIL_ACCOUNT_0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 0xf39F…2266
const ANVIL_ACCOUNT_1 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // 0x7099…79C8

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
  /** Platform take rate in basis points (1000 = 10%). */
  platformFeeBps: parseInt(env('PLATFORM_FEE_BPS', '1000'), 10),
  /** The paying demo agent. In chain mode this account must hold USDC. */
  agentPrivateKey: env('AGENT_PRIVATE_KEY', mode === 'chain' ? ANVIL_ACCOUNT_1 : ANVIL_ACCOUNT_0) as `0x${string}`,
  dataDir: env('DATA_DIR', 'data'),

  // ── chain-mode settings (ignored in mock mode) ──
  /** EVM JSON-RPC endpoint. */
  rpcUrl: env('RPC_URL', 'http://127.0.0.1:8545'),
  /** Chain id used for the EIP-712 domain (must match the RPC's chain). */
  chainId: parseInt(env('CHAIN_ID', '43113'), 10),
  /** The EIP-3009 USDC token to settle in. Default = Anvil's deterministic first-deploy. */
  usdcAddress: env('USDC_ADDRESS', '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`,
  usdcName: env('USDC_NAME', 'USD Coin'),
  usdcVersion: env('USDC_VERSION', '2'),
  usdcDecimals: parseInt(env('USDC_DECIMALS', '6'), 10),
  /** Facilitator wallet — submits settlement txs and pays gas. */
  facilitatorPrivateKey: env('FACILITATOR_PRIVATE_KEY', ANVIL_ACCOUNT_0) as `0x${string}`,
};

/** True when settlement actually hits a blockchain. */
export const isLive = config.mode === 'chain';

/** Platform fee as a fraction (0.10 for 10%). */
export const platformFeeRate = config.platformFeeBps / 10_000;
