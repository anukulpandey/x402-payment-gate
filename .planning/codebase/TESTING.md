# Testing Patterns

**Analysis Date:** 2026-07-03

## Test Framework

**Status:** No automated tests configured

**Framework:**
- No test runner present (Jest, Vitest not installed)
- No test files found in codebase
- No test configuration files (jest.config.js, vitest.config.ts, etc.)

**Testing Approach:**
- Manual testing via CLI and browser
- Integration testing via real API calls
- Simulation endpoint for agent interaction testing: `GET /api/endpoints/{id}/simulate` (documented in `web/src/lib/api.ts` line 152)

## Manual Testing & Simulation

**Available Simulation Endpoint:**
- Location: `src/routes/api.ts` (inferred from client-side interface)
- Usage: `api.simulate(id: string)` returns `SimResult` with step-by-step trace
- Response type includes: `{ ok, mode, endpoint, durationMs, steps, error }`
- Step kinds: `'request' | 'quote' | 'sign' | 'pay' | 'settle' | 'deliver' | 'split'`
- Allows testing payment flow without real blockchain (see `web/src/lib/api.ts` lines 89–105)

**CLI Testing:**
- Development: `npm run dev` (concurrent API + web servers)
- Agent interaction: `npm run agent` executes `src/agent/demo-agent.ts` against local API
- Seeding: `npm run seed` populates test endpoints via `src/seed.ts`
- Chain mode: `npm run fuji:setup` configures Avalanche Fuji testnet deployment
- Fuji agent: `npm run fuji:agent` runs demo agent against Fuji network

## Test Data & Fixtures

**Seed Data:**
- Location: `src/seed.ts`
- Provides `EXAMPLES` constant with sample endpoints for dashboard
- Loaded via `POST /api/examples` endpoint (line 94, `src/routes/api.ts`)
- Contains realistic gateway configurations for testing

**Demo Agent:**
- Location: `src/agent/demo-agent.ts`
- Executable via CLI (`npm run agent`)
- Tests end-to-end payment flow: connects to local API, signs x402 payments, calls gated endpoints
- Full simulation of agent workflow without external dependencies

## Validation & Verification

**Input Validation:**
- Location: `src/routes/api.ts` uses Zod schema validation
- Example schema (CreateSchema, line 62–74):
```typescript
const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  upstreamUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY']).default('ANY'),
  priceUsd: z.coerce.number().min(0.000001).max(1000),
  description: z.string().trim().max(280).optional().default(''),
  requireIdentity: z.coerce.boolean().optional().default(false),
  minReputation: z.coerce.number().int().min(0).max(1000).optional().default(0),
});
```
- Error responses: `res.status(400).json({ error: 'Invalid endpoint', issues: parsed.error.flatten() })`

**Type Safety:**
- Strict TypeScript enabled (`"strict": true` in tsconfig.json)
- No `any` types in codebase
- Function return types explicit throughout

**Cryptographic Verification:**
- EIP-712 signature verification: `verifyMessage()` in auth flow (`src/auth.ts` line 56)
- x402 payment validation: `verifyPayment()` in gateway (`src/x402/facilitator.ts`)
- One-time nonce enforcement: nonces deleted after use (`src/auth.ts` line 58)

## Common Patterns

**Error Testing (Manual):**
- Invalid signatures handled by returning `false` in catch: `await verifyMessage(...).catch(() => false)` (src/auth.ts line 56)
- Expired nonces rejected: check `exp < Date.now()` (src/auth.ts line 55)
- Method mismatch caught: `endpoint.method !== 'ANY' && req.method !== endpoint.method` returns 405 (src/routes/gateway.ts line 97)
- Missing payment header: returns 402 with requirements (src/routes/gateway.ts line 122)

**Async Testing:**
- Demo agent uses async/await: `npm run agent` executes full flow end-to-end
- Parallel request testing: Dashboard refreshes 3 API calls simultaneously (src/pages/Dashboard.tsx line 72):
```typescript
const [eps, st, cl] = await Promise.all([api.endpoints(), api.stats(), api.calls(30)]);
```
- Promise chains for error propagation: `.then(...).catch()`

**Payment Flow Testing:**
- Full flow simulated via endpoint (POST /api/endpoints/{id}/simulate)
- Steps traced: request → quote → sign → pay → settle → deliver → split
- Mock mode: signatures verified but settlement simulated
- Chain mode: real on-chain settlement against Fuji testnet

## Current Test Gaps

**No Automated Test Coverage:**
- No unit tests for utility functions (`src/revenue.ts`, `src/auth.ts`)
- No route handler tests (no mocking of Express middleware)
- No component tests (React components not tested)
- No integration tests for payment flows
- No load/stress testing

**Manual Verification Required:**
- Payment signature generation/verification: only tested via demo agent
- SSRF protection (`src/net/ssrf.ts`): logic present but no tests
- ERC-8004 identity resolution (`src/erc8004/registry.ts`): no tests
- Redis persistence (`src/store.ts`): only tested in production
- Concurrent mutation safety: acknowledged limitation (line 34, src/store.ts) — "concurrent mutations on different instances can clobber one another"

## Recommended Testing Strategy

**Immediate (Unit Tests):**
- Add Vitest or Jest configuration
- Test utility functions first: `round6()`, `splitRevenue()`, `usdToAtomic()`
- Test auth logic: nonce generation, signature verification, token issuance
- Test store operations: CRUD for endpoints/calls/withdrawals

**Medium (Integration Tests):**
- Test route handlers with mocked dependencies
- Mock external calls: Redis, blockchain RPC
- Test payment verification flow end-to-end
- Test gateway request → settlement flow

**High (E2E):**
- Test full agent workflow against local API
- Test multi-endpoint scenarios
- Test ERC-8004 identity/reputation enforcement
- Test concurrent requests and edge cases

---

*Testing analysis: 2026-07-03*
