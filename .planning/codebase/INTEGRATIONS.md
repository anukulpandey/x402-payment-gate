# External Integrations

**Analysis Date:** 2026-07-03

## APIs & External Services

**Payment Protocol & Signatures:**
- x402 - x402 payment protocol for signed, cryptographic payment rails
  - SDK/Client: `x402` v1.2.0 (types, protocol definitions)
  - SDK/Client: `x402-fetch` v1.2.0 (fetch wrapper)
  - Used in: `src/x402/protocol.ts`, `src/x402/facilitator.ts`, `src/routes/gateway.ts`
  - Auth: No explicit auth; uses EIP-712 signed payments embedded in `X-PAYMENT` header

**Blockchain & Wallet Interaction:**
- Ethereum / EVM Network - Avalanche Fuji testnet (chain id 43113)
  - SDK/Client: `viem` v2.21.55 (EVM utilities, signing, RPC calls)
  - RPC: `process.env.RPC_URL` → defaults to `https://api.avax-test.network/ext/bc/C/rpc`
  - Used in: `src/x402/chain.ts`, `src/erc8004/registry.ts`

**Proxy & Gateway:**
- Generic REST API Gateway - Proxies any upstream REST API behind x402 payment gate
  - No SDK; raw `fetch()` to user-supplied `upstreamUrl`
  - SSRF validation: `src/net/ssrf.ts` ensures URLs are public HTTP(S) destinations
  - Timeout: 30 seconds per request
  - Used in: `src/routes/gateway.ts` (lines 186–196)

**Demo Upstream APIs (in seed data):**
- GitHub Zen API - `https://api.github.com/zen` (example gated endpoint)
- Dog CEO API - `https://dog.ceo/api/breeds/image/random` (example)
- CoinGecko API - `https://api.coingecko.com/api/v3/simple/price` (example)
- Joke API - `https://official-joke-api.appspot.com/random_joke` (example)

## Data Storage

**Databases:**
- None (no traditional RDBMS)

**File Storage:**
- Local Filesystem (file backend)
  - Location: `data/db.json`
  - Format: Single JSON blob containing endpoints, calls, withdrawals
  - Used by: `src/store.ts` in long-running mode (local dev, Render, self-hosted)
  - Persistence: Debounced writes (50ms), atomic via temp file + rename

- Redis / Upstash (serverless backend)
  - Provider: Upstash (managed Redis REST API)
  - Endpoint: `process.env.UPSTASH_REDIS_REST_URL`
  - Auth: `process.env.UPSTASH_REDIS_REST_TOKEN`
  - Alternative env vars (Vercel marketplace): `KV_REST_API_URL`, `KV_REST_API_TOKEN`
  - Client: `@upstash/redis` v1.38.0
  - Used in: `src/store.ts` when `UPSTASH_REDIS_REST_URL` and token are set
  - Storage: Single JSON key `gatekeep:db` (whole-blob writes, simple but concurrent-write-unsafe demo approach)
  - Used by: Vercel serverless deployments (stateless instances)

**Caching:**
- None configured; no cache layer between Gateway and upstream

## Authentication & Identity

**Auth Provider:**
- Custom SIWE-style (Sign-In with Ethereum)
  - No external auth service; self-hosted JWT issuer
  - Mechanism: Wallet signature verification → session JWT
  - Implementation: `src/auth.ts`
  - JWT Secret: `process.env.JWT_SECRET` (change in production)
  - Session cookie: `gk_session` (httpOnly, same-origin)

**Wallet Integration:**
- MetaMask / Web3 wallet (frontend client-side)
  - Mechanism: `window.ethereum.request()` for signing (SIWE nonce message)
  - Frontend: `web/src/lib/wallet.tsx`
  - No SDK; browser native wallet API

**ERC-8004 Trustless Agents (optional chain mode feature):**
- Identity Registry (on-chain contract)
  - Contract: Deployed at `process.env.IDENTITY_REGISTRY`
  - Chain: Avalanche Fuji
  - Used by: `src/erc8004/registry.ts` to resolve agent identities
  - Feature: Agents call `register()` to bind payment wallet to agent ID

- Reputation Registry (on-chain contract)
  - Contract: Deployed at `process.env.REPUTATION_REGISTRY`
  - Chain: Avalanche Fuji
  - Used by: Gates can require `minReputation` and earn reputation from paid calls
  - Feature: Agents gain reputation score on successful payments

## Monitoring & Observability

**Error Tracking:**
- None configured; errors logged to stdout via `console.error()`

**Logs:**
- Console output to stdout
  - App startup logs: `src/server.ts` (bootup diagnostics)
  - Store operation logs: `src/store.ts` (Redis/file errors)
  - Payment verification logs: Errors in `src/x402/facilitator.ts`
  - No structured logging; plain text

## CI/CD & Deployment

**Hosting:**
- Vercel serverless (primary)
  - Build: `npm run vercel-build` (Vite frontend + tsc server)
  - Output directory: `web/dist/`
  - Functions: `api/index.ts` (serverless handler, 30s timeout)
  - Static: CDN-served, SPA with client-side routing

- Alternative: Node.js host (local, Docker, Render, etc.)
  - Start: `npm run start` (NODE_ENV=production)
  - Long-running server: `src/server.ts` listening on `PORT`

**CI Pipeline:**
- None detected; no GitHub Actions, GitLab CI, or similar

## Environment Configuration

**Required env vars:**
- **Always:**
  - `PUBLIC_BASE_URL` - Public origin of the service
  - `PLATFORM_WALLET` - USDC receiver address
  - `JWT_SECRET` - Session JWT secret
  - `AGENT_PRIVATE_KEY` - Demo agent signer

- **Chain mode only (X402_MODE=chain):**
  - `RPC_URL` - EVM RPC endpoint
  - `CHAIN_ID` - Chain ID (43113 for Avalanche Fuji)
  - `USDC_ADDRESS` - EIP-3009 USDC token address
  - `FACILITATOR_PRIVATE_KEY` - Settlement submitter key
  - `PLATFORM_PRIVATE_KEY` - Platform withdrawal signer

- **ERC-8004 optional (trustless agents):**
  - `IDENTITY_REGISTRY` - ERC-721 identity registry contract
  - `REPUTATION_REGISTRY` - Reputation tracking contract

- **Serverless (Vercel/Upstash):**
  - `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL`
  - `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN`

**Secrets location:**
- Environment variables (injected at runtime)
- Local: `.env.fuji` and `.env` files (git-ignored, not committed)
- Vercel: Project environment settings (dashboard or GitHub integration)
- Upstash: Redis credentials passed via env vars

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- ERC-8004 feedback calls: `src/erc8004/registry.ts` calls `giveFeedback()` on successful paid interactions
  - Mechanism: Submits agent reputation attestation on-chain
  - Triggered by: Paid call completion in `src/routes/gateway.ts` (line 259)

---

*Integration audit: 2026-07-03*
