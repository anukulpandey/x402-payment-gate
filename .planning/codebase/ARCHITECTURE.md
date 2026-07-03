<!-- refreshed: 2026-07-03 -->
# Architecture

**Analysis Date:** 2026-07-03

## System Overview

GateKeep is an x402 payment-gated API proxy. Users (sellers) wrap their REST endpoints behind a price gate; agents call those endpoints by signing x402 payments (EIP-712 typed data), which GateKeep verifies and settles (either cryptographically in mock mode or on-chain for real USDC). The system routes requests through a payment verification → upstream proxy → revenue split → ledger flow, with optional ERC-8004 identity/reputation checks.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard & API Control Plane                 │
│  `web/` (React+Tailwind)  +  API Routes `routes/api.ts`         │
│  - Sellers manage gates   - List/create/delete endpoints        │
│  - View call history      - Stats aggregation                   │
│  - Request withdrawals    - Seeding examples                    │
└────────────────┬──────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────────┐  ┌──────────────────────────────────┐
│  Auth Layer      │  │  Payment Gateway Layer           │
│ `routes/auth.ts` │  │  `routes/gateway.ts`             │
│ `auth.ts`        │  │  - x402 protocol decode          │
│ - SIWE flow      │  │  - Signature verification        │
│ - JWT sessions   │  │  - ERC-8004 identity check       │
│ - Nonce mgmt     │  │  - SSRF validation               │
└──────────────────┘  │  - Upstream proxy + header rewrite│
                      │  - Call recording                 │
                      └──────────┬───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌─────────────────────────┐  ┌──────────────────────┐
        │  x402 Protocol Layer    │  │  ERC-8004 Registry   │
        │  `x402/protocol.ts`     │  │  `erc8004/`          │
        │  `x402/signer.ts`       │  │  - Identity lookup   │
        │  `x402/facilitator.ts`  │  │  - Reputation check  │
        │  - EIP-712 signing      │  │  - Agent feedback    │
        │  - Payment req builder  │  │                      │
        │  - Signature verify     │  └──────────────────────┘
        │  - Settlement (mock)    │
        └────────────┬────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  On-Chain Settlement Layer   │
        │  `x402/chain.ts`             │
        │  (chain mode only)           │
        │  - EIP-3009 transfers        │
        │  - Facilitator tx broadcast  │
        │  - Payout signing            │
        └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Data Persistence                         │
│  `store.ts` → File (local) or Redis (Upstash / Vercel)         │
│  - GatedEndpoint list                                           │
│  - CallRecord ledger (max 2000 recent)                          │
│  - Withdrawal history                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **HTTP Server** | Express app initialization, middleware setup, static serving | `src/app.ts` |
| **Payment Verification** | EIP-712 signature validation, nonce dedup, amount checks | `src/x402/facilitator.ts` |
| **Payment Signing** | EIP-712 typed data creation, agent-side signing | `src/x402/signer.ts` |
| **Protocol Builder** | x402 PaymentRequirements construction, asset resolution | `src/x402/protocol.ts` |
| **On-Chain Settlement** | EIP-3009 transfers, facilitator tx broadcast, payout logic | `src/x402/chain.ts` |
| **Gateway Router** | x402 payment gate, upstream proxy, SSRF guard, call recording | `src/routes/gateway.ts` |
| **Auth Router** | SIWE sign-in flow, nonce distribution, JWT issuance | `src/routes/auth.ts` |
| **API Router** | Seller endpoint CRUD, stats, withdrawal requests | `src/routes/api.ts` |
| **Data Store** | In-memory DB with dual persistence (file / Redis) | `src/store.ts` |
| **Web Dashboard** | Seller UI: create gates, view earnings, sign in | `web/src/App.tsx`, `web/src/pages/Dashboard.tsx` |

## Pattern Overview

**Overall:** Event-driven REST API + dual-mode payment processor (mock / on-chain).

**Key Characteristics:**
- **Dual settlement modes** — offline cryptographic verification (mock) or real EIP-3009 USDC settlement (chain)
- **Session-based auth** — SIWE (Sign-In With Ethereum) + JWT cookies; no passwords
- **Stateless + serverless-ready** — Data persists to Redis (Upstash) on Vercel or file-backed in long-running servers
- **Zero-trust upstream** — SSRF validation on all proxied URLs; hop-by-hop header filtering
- **Revenue ledger** — Every paid call is recorded with split: platform fee % + seller earnings

## Layers

**Presentation:**
- Purpose: Dashboard and public landing pages for sellers and agents
- Location: `web/src/`
- Contains: React components, auth context, wallet integration, API client
- Depends on: `/api`, `/api/auth`, `/g` (gateway)
- Used by: Browsers (sellers and agents testing)

**HTTP API:**
- Purpose: Control plane for sellers (endpoint management) and facilitator interface
- Location: `src/routes/` (auth, api, gateway, facilitator routers)
- Contains: Express route handlers
- Depends on: auth, store, x402, ERC-8004, config
- Used by: Dashboard frontend, x402 client agents, manual API calls

**Business Logic:**
- Purpose: Payment protocol, signature verification, settlement execution
- Location: `src/x402/`, `src/erc8004/`, `src/auth.ts`, `src/revenue.ts`
- Contains: Signing/verification, on-chain integrations, identity checks
- Depends on: viem, x402 SDK, config
- Used by: Gateway router and API routes

**Persistence:**
- Purpose: Durable storage of endpoints, call history, and withdrawals
- Location: `src/store.ts`
- Contains: In-memory DB with file/Redis backends
- Depends on: config (for backend selection)
- Used by: All routes

**Configuration:**
- Purpose: Environment-driven settings for mode, chain, fees, secrets
- Location: `src/config.ts`
- Contains: Parsed env vars, derived values (mode, isLive, erc8004Enabled)
- Depends on: dotenv
- Used by: Every module

## Data Flow

### Primary Request Path: Gated API Call

1. **Client initiates call** (`web/src/lib/api.ts` or x402-fetch SDK)
   - Sends HTTP request to `/g/{endpointId}` without payment header

2. **Gateway receives unpaid request** (`src/routes/gateway.ts`)
   - Looks up endpoint by ID; validates method and active status
   - Builds PaymentRequirements (price, resource URL, network)
   - Returns HTTP 402 with requirements in JSON body (`src/x402/protocol.ts`)

3. **Client signs payment** (x402-fetch or manual EIP-712 signing)
   - Uses agent's private key to sign EIP-712 typed data (transferWithAuthorization)
   - Constructs PaymentPayload with signature + authorization fields
   - Retries request with `X-PAYMENT` header

4. **Gateway verifies signature** (`src/x402/facilitator.ts`)
   - Decodes X-PAYMENT header
   - Recovers signer address from EIP-712 signature
   - Checks: scheme match, network match, amount >= required, expiry valid, nonce not seen
   - In mock mode: simulation stops here (settledNonces.add)
   - In chain mode: calls `settlePayment()` on-chain

5. **ERC-8004 checks (if enabled)** (`src/erc8004/registry.ts`)
   - Resolves agent identity and reputation from on-chain registry
   - Enforces endpoint's minReputation and requireIdentity policies
   - Returns 403 if policies not met

6. **SSRF validation** (`src/net/ssrf.ts`)
   - Blocks requests to private IP ranges, localhost, link-local, etc.

7. **Upstream proxy** (fetch with raw request body)
   - Forwards to endpoint.upstreamUrl with caller's method/headers/body
   - Strips hop-by-hop and credential headers
   - Merges URL query parameters
   - Timeout: 30 seconds

8. **Call recorded** (`src/store.ts`)
   - Inserts CallRecord with paid=true, amountUsd, splits, txHash
   - Caps history at 2000 most recent calls

9. **Response returned to client**
   - Upstream status + body forwarded as-is
   - Added header: `X-Gatekeep-Tx` (txHash in chain mode)

### Secondary Flow: Seller Withdrawal

1. Seller requests payout via `/api/withdrawals` (authenticated)
2. Platform wallet signs EIP-3009 transfer to seller's address
3. Facilitator broadcasts tx on-chain
4. Withdrawal record stored with txHash

### Data Models

- **GatedEndpoint** (`src/types.ts`)
  - Seller owns N endpoints; each has URL, price, optional ERC-8004 policies
  - Denormalized name + ownerAddress for fast filtering

- **CallRecord** (`src/types.ts`)
  - One entry per request (paid or unpaid)
  - Timestamps, amounts, splits, payer, txHash for audit trail
  - Bounded to 2000 recent to prevent unbounded growth

- **Withdrawal** (`src/types.ts`)
  - Seller payout event with txHash proof

**State Management:**
- State lives in `db: DB` (in-memory) in `src/store.ts`
- File backend: JSON at `{DATA_DIR}/db.json`, debounced writes, atomic via temp file + rename
- Redis backend: Single blob key `gatekeep:db`, fetched at start of each request, concurrent writes can clobber (noted as non-ideal for high-write deploys)
- Session state: Nonce map in memory (`src/auth.ts`), cleaned up by TTL

## Key Abstractions

**x402 Protocol:**
- Purpose: Represent the payment handshake (requirements → signed payload → settlement)
- Examples: `PaymentRequirements`, `PaymentPayload` (from x402 SDK), `buildPaymentRequirements()`, `decodePaymentHeader()`, `signPayment()`
- Pattern: Encode/decode between HTTP headers and domain objects; treat as serializable envelopes

**EIP-712 Typed Data:**
- Purpose: Cryptographically bind a payment authorization to a specific domain (chain, token, facilitator)
- Examples: `TRANSFER_WITH_AUTHORIZATION_TYPES`, `eip712Domain()` in `src/x402/protocol.ts`
- Pattern: Recover signer via `recoverTypedDataAddress` (viem); compare to expected sender

**Facilitator Role:**
- Purpose: Gateway between x402 protocol and on-chain settlement
- Examples: `verifyPayment()`, `settlePayment()` in `src/x402/facilitator.ts`
- Pattern: Verify offchain (both modes), simulate in mock, broadcast in chain mode

**Store Backend Selection:**
- Purpose: Abstract persistence so same app works locally and serverless
- Examples: `useRedis` flag in `src/store.ts`, conditional `loadRedis()`/`saveRedis()` vs `loadFile()`/`writeNow()`
- Pattern: Lazy initialization of Redis client; no-op if unconfigured

## Entry Points

**Server (Long-Running):**
- Location: `src/server.ts`
- Triggers: `npm run dev:api` or `npm run start` or `npm run fuji:start`
- Responsibilities: Listen on port, emit startup diagnostics (chain, agent wallet, facilitator)

**Serverless Function:**
- Location: `api/index.ts` (Vercel)
- Triggers: HTTP request to the Vercel deployment
- Responsibilities: Adapt Vercel's pre-buffered request body to Express streams, hand to app

**App Factory:**
- Location: `src/app.ts`
- Triggers: Imported by both server.ts and api/index.ts
- Responsibilities: Instantiate Express app, mount routers, static serving, middleware

**CLI / Seed:**
- Location: `src/seed.ts`
- Triggers: `npm run seed`
- Responsibilities: Populate store with example endpoints for demo

**Agent Demo:**
- Location: `src/agent/demo-agent.ts`
- Triggers: `npm run agent` or `npm run fuji:agent`
- Responsibilities: Standalone client that calls gated endpoints with x402 signing

## Architectural Constraints

- **Threading:** Single-threaded event loop (Node.js); no worker threads used. X402 signing is CPU-bound but offloaded to user's agent (not server).
- **Global state:** Nonce map (`src/auth.ts`), settled nonce set (mock mode in `src/x402/facilitator.ts`), and clients/platformWallet singletons (`src/x402/chain.ts`) are module-level. Store is also global but wrapped in an API.
- **Circular imports:** None detected; imports are acyclic (config → app → routes → auth/store/x402).
- **Concurrent writes:** File backend is debounced + atomic; Redis backend can lose concurrent mutations (acceptable for demo, would need sharding for production).
- **No transactions:** Each store mutation is independent; no multi-record ACID. Payments are idempotent (nonce dedup) but call records can duplicate on retry.
- **Static analysis:** TypeScript strict mode; Zod schemas for API payloads.

## Anti-Patterns

### Whole-DB Redis Reads Per Request

**What happens:** `store.load()` fetches the entire DB blob from Redis at the start of every request.
**Why it's wrong:** Scalability and latency. Every request (even a write-only POST) pays the read penalty; concurrent updates clobber each other's writes.
**Do this instead:** Shard the store by key (endpoints by ownerAddress, calls by endpointId, withdrawals by ownerAddress); use Redis atomic operations (INCR, APPEND) for counters; or adopt an operational database (Postgres, MongoDB).

### Header Filtering by Hardcoded Exclusion List

**What happens:** `HOP_BY_HOP` set in `src/routes/gateway.ts` explicitly names headers to strip.
**Why it's wrong:** New hop-by-hop headers (or credential-like headers) can be missed; maintenance burden.
**Do this instead:** Parse the Connection header (lists hop-by-hop to remove) and strip by RFC 7230 rules; or use a whitelist of allowed headers instead.

### Nonce-Based Replay Protection in Mock Mode

**What happens:** In-memory `settledNonces` set in `src/x402/facilitator.ts` tracks signed nonces; prevents same signature being used twice.
**Why it's wrong:** Not persistent; nonces lost on server restart. A captured X-PAYMENT header can be replayed after reboot in mock mode.
**Do this instead:** Persist nonces to the store (e.g., a `usedNonces` array); or move to chain mode where the USDC contract enforces nonce uniqueness.

### Unbounded Call History on Disk/Memory

**What happens:** `db.calls` is capped at 2000 but still grows until the cap; old calls are never archived.
**Why it's wrong:** Long-running servers accumulate months of data; query slowdown.
**Do this instead:** Archive old calls to cold storage (S3, separate DB) on a schedule; keep only recent calls in hot storage.

## Error Handling

**Strategy:** Layered catch-all with HTTP status codes and JSON error bodies.

**Patterns:**
- **HTTP 402 (Payment Required)** — Unpaid request; returns PaymentRequirements
- **HTTP 400 (Bad Request)** — Invalid payload/schema (Zod validation)
- **HTTP 401 (Unauthorized)** — Not signed in or invalid JWT
- **HTTP 403 (Forbidden)** — Insufficient ERC-8004 reputation or identity
- **HTTP 404 (Not Found)** — Endpoint doesn't exist or is inactive
- **HTTP 405 (Method Not Allowed)** — Caller's HTTP method doesn't match endpoint's allowed method
- **HTTP 502 (Bad Gateway)** — Upstream unreachable, SSRF blocked, or upstream error
- **500 errors** — Logged to console; no detailed stack leakage

**Specific Handlers:**
- Payment verification failures return a reason code (invalid_scheme, invalid_network, duplicate_settlement, payment_expired)
- Store load/save errors are logged but don't block requests (fail-open for availability)
- Chain RPC errors are logged at boot but don't crash; subsequent transactions will error

## Cross-Cutting Concerns

**Logging:** `console.log/error` sprinkled throughout (no structured logger). Key points: startup banner, store backend, chain warnings, verification failures.

**Validation:** 
- x402 payload: validated by signature verification
- Endpoint CRUD: validated by Zod schema (`CreateSchema` in routes/api.ts)
- Auth: validated by SIWE signature verification
- URLs: validated by URL() constructor + SSRF guard

**Authentication:**
- Sellers: SIWE sign-in → JWT in httpOnly cookie (gk_session)
- Agents: x402 signature (no account required, payment is the credential)
- Facilitator calls: No auth (public HTTP surface; auth delegated to x402 verification)

**Call Recording:**
- Every request (paid or unpaid) recorded unless it's a dashboard probe (x-gatekeep-internal: probe header)
- Stats computed on-demand by filtering and summing the call ledger

---

*Architecture analysis: 2026-07-03*
