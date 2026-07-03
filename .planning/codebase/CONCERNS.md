# Codebase Concerns

**Analysis Date:** 2026-07-03

## Tech Debt

**Concurrent mutations in Redis backend:**
- Issue: The store uses whole-blob JSON reads/writes to Redis. Multiple concurrent requests on different serverless instances can clobber one another's mutations — last write wins.
- Files: `src/store.ts` (lines 29-67)
- Impact: Data loss on high-concurrency deployments. A burst of simultaneous payments/endpoint updates can silently lose records.
- Fix approach: Implement optimistic locking with versioning or atomic Redis transactions. For production with >10 QPS, migrate to per-entity keys with Redis MGET/MSET pipelines or a proper database (PostgreSQL).

**In-memory nonce tracking in mock mode:**
- Issue: Mock mode stores settled nonces in a `Set<string>()` (line 44 in `src/x402/facilitator.ts`). This is not persisted and resets on server restart.
- Files: `src/x402/facilitator.ts` (line 44)
- Impact: Replay attacks possible in mock mode if the server restarts between payment and verification. An old captured X-PAYMENT header can be replayed.
- Fix approach: For production (live mode), nonces are enforced on-chain by the USDC contract, so this is not a production risk. For mock mode, persist the settled nonces set to Redis or filesystem (alongside the main DB).

**No test coverage:**
- Issue: Zero automated tests across the backend (src/) and frontend (web/). No unit tests, integration tests, or E2E tests.
- Files: Project-wide
- Impact: Regressions slip through. Payment logic, SSRF guards, authorization checks, and revenue splitting are untested. Breaking changes to route handlers or schema validation go undetected.
- Fix approach: Add Jest/Vitest test suite. Prioritize: (1) `src/routes/gateway.ts` payment flow, (2) `src/x402/facilitator.ts` signature verification, (3) `src/store.ts` CRUD operations, (4) `src/auth.ts` JWT/SIWE logic.

**Implicit-any type cast in Vercel handler:**
- Issue: The Vercel serverless entry point silently imports from `dist/app.js` with `@ts-ignore` (line 5 in `api/index.ts`). This was added to work around a build quirk but bypasses type checking on the import.
- Files: `api/index.ts` (line 5)
- Impact: Type errors in `src/app.ts` won't be caught during Vercel builds. Silent runtime failures possible if app's default export changes.
- Fix approach: Use `vite build` output directly or ensure `tsconfig.server.json` produces proper type declarations.

## Known Bugs

**Query parameter limit not validated on input:**
- Symptoms: The `/api/calls?limit=...` endpoint accepts any integer via `parseInt(String(req.query.limit ?? '50'), 10)`. It clamps to 200 but doesn't validate the original string.
- Files: `src/routes/api.ts` (line 156)
- Trigger: Call `/api/calls?limit=Infinity` or `/api/calls?limit=NaN` → `parseInt` returns `NaN`, `Math.min(NaN, 200)` returns `200`, so it's clamped safely. Not actually a bug, but `parseInt` silently coerces invalid input.
- Workaround: The clamp prevents harm, but logging invalid values would catch fuzzing attempts.

**Upstream response body buffered entirely in memory:**
- Symptoms: Long-running upstream responses (e.g., streaming endpoints, large file downloads) are fully buffered in `bodyBuf` (line 203 in `src/routes/gateway.ts`) before being sent to the client.
- Files: `src/routes/gateway.ts` (line 203)
- Trigger: An upstream that sends >5MB (express.raw limit) will error cleanly. But a 100MB response is buffered in memory before streaming — no backpressure.
- Workaround: The 5MB limit on body size prevents pathological cases, but streaming from upstream to client directly would be more efficient.

**Race condition in endpoint fetch + TOCTOU gap:**
- Symptoms: `src/routes/gateway.ts:92` retrieves an endpoint, checks `active`, then probes it later. Between the check and the request, another request could delete/deactivate it.
- Files: `src/routes/gateway.ts` (lines 92–166)
- Trigger: Rare in practice (same user would need to deactivate while a payment is mid-flight), but possible.
- Workaround: Re-fetch and re-validate the endpoint's `active` status right before proxying to upstream.

## Security Considerations

**Private key exposure in .env.fuji:**
- Risk: The `.env.fuji` file contains real private keys for Fuji testnet accounts (facilitator, platform, agent). If committed or leaked, those testnet wallets are compromised.
- Files: `.env.fuji` (not to be read, but noted as a risk)
- Current mitigation: The file is gitignored (in `.gitignore`), but accidental commits or backup leaks are possible. Keys are testnet-only, but a security habit violation.
- Recommendations: (1) Document that `.env.fuji` must never be committed. (2) Rotate keys after each hackathon/demo. (3) Consider using a secrets manager (e.g., Vercel Secrets) for production.

**SSRF protection has a TOCTOU gap:**
- Risk: The gateway validates the upstream URL at request time (line 168 in `src/routes/gateway.ts`), but fetch's own DNS lookup happens after. An attacker who controls DNS could respond with a private IP between validation and fetch.
- Files: `src/routes/gateway.ts` (line 168), `src/net/ssrf.ts`
- Current mitigation: The `redirect: 'manual'` flag prevents following redirect chains into private space. Residual risk is acknowledged in code comment (line 13 in `src/net/ssrf.ts`).
- Recommendations: (1) For MVP this is acceptable. (2) For production, use a fixed allowlist of upstream domains or whitelist DNS-over-HTTPS endpoints to reduce TOCTOU window.

**JWT secret is hardcoded for development:**
- Risk: `config.jwtSecret` defaults to `'gatekeep-dev-secret-change-in-production'` (line 37 in `src/config.ts`). If deployed without setting `JWT_SECRET` env var, all session tokens use this known secret.
- Files: `src/config.ts` (line 37)
- Current mitigation: Explicitly marked in code comment as "CHANGE IN PRODUCTION."
- Recommendations: (1) Throw an error on startup if `JWT_SECRET` is not set in production. (2) Use environment validation schema (Zod) to enforce secrets before server starts.

**Demo agent private key is public:**
- Risk: `DEMO_SIGNING_KEY` is hardcoded (line 20 in `src/config.ts`) and used in mock mode for default agent signing. This key is widely known from Hardhat examples.
- Files: `src/config.ts` (line 20)
- Current mitigation: It's only used in mock mode and only holds test tokens (not real funds).
- Recommendations: (1) For production, require `AGENT_PRIVATE_KEY` to be set in `.env`. (2) Document that the demo key is for local testing only.

**No rate limiting on payment endpoints:**
- Risk: `/g/:id` gated endpoints accept unlimited payment attempts without throttling. An attacker could spam 402 responses to DOS the endpoint or the database.
- Files: `src/routes/gateway.ts` (line 86)
- Current mitigation: Payment verification is expensive (EIP-712 signature check), so brute force is self-throttling. Redis backend has rate limits via Upstash (if configured), but file backend has none.
- Recommendations: (1) Add per-IP request rate limiting via `express-rate-limit`. (2) Log failed payment attempts and flag IPs with >N failures/minute.

**Nonce generation entropy check:**
- Risk: Nonces use `crypto.randomBytes(16)` (line 43 in `src/auth.ts`), which is cryptographically sound, but there's no documented minimum entropy requirement or verification.
- Files: `src/auth.ts` (line 43)
- Current mitigation: Node.js's crypto module is secure if the system has sufficient entropy (usually fine in production).
- Recommendations: (1) On startup, verify entropy pool is seeded. (2) Consider using `crypto.getRandomValues()` (Web Crypto API) for explicit entropy sourcing.

## Performance Bottlenecks

**Whole-DB scans on every stats/calls query:**
- Problem: `/api/stats` and `/api/calls` filter the entire `db.calls` array in memory. As the call ledger grows to thousands, these become O(N) operations.
- Files: `src/routes/api.ts` (lines 160–177), `src/store.ts` (lines 182–201)
- Cause: The store is a flat JSON array with no indexing. No database.
- Improvement path: (1) Short term: add in-memory index `Map<ownerAddress, CallRecord[]>` in store. (2) Long term: migrate to a real DB (PostgreSQL) with indexed columns on `ownerAddress` and `endpointId`.

**Redis blob rewrites on every mutation:**
- Problem: Each mutation (add call, add withdrawal, update endpoint) serializes and re-uploads the entire DB to Redis.
- Files: `src/store.ts` (lines 59–67)
- Cause: Whole-blob design for simplicity.
- Improvement path: (1) Shard by entity type (endpoints, calls, withdrawals as separate keys). (2) Use Redis Streams for append-only call log. (3) Implement incremental updates instead of full rewrites.

**Endpoint resolution O(N) per gateway request:**
- Problem: `store.getEndpoint(id)` iterates the entire endpoints array (line 150 in `src/store.ts`).
- Files: `src/store.ts` (lines 149–151)
- Cause: No hash index.
- Improvement path: Maintain `Map<endpointId, GatedEndpoint>` alongside the array for O(1) lookup.

**Frontend polling every 2.5 seconds:**
- Problem: Dashboard calls `refresh()` on a 2500ms interval (line 90 in `web/src/pages/Dashboard.tsx`), which fetches endpoints, stats, and calls in parallel. On large deployments, this creates unnecessary server load.
- Files: `web/src/pages/Dashboard.tsx` (line 90)
- Cause: Simple polling instead of WebSocket or server-sent events.
- Improvement path: (1) Increase interval to 5–10s. (2) Use WebSocket for real-time updates. (3) Add Last-Modified / ETag caching on API responses.

## Fragile Areas

**Signature verification in facilitator:**
- Files: `src/x402/facilitator.ts`, `src/x402/chain.ts`
- Why fragile: The EIP-712 recovery logic is cryptographically sensitive. A subtle change to domain parameters, type definitions, or message structure will cause all signatures to fail. The logic is duplicated between mock and chain modes (lines 46–96 vs. 128–150+).
- Safe modification: (1) Write comprehensive test suite for `verifyPayment` with known good signatures. (2) Centralize the EIP-712 types in `x402/protocol.ts`. (3) Use viem's `recoverTypedDataAddress` without customization; don't reimplement.
- Test coverage: Zero tests. Critical path.

**Payment settlement logic:**
- Files: `src/routes/gateway.ts` (lines 218–241)
- Why fragile: If settlement fails after verification, the code returns a 402 retry. But the record is only logged *after* settlement is confirmed. A crash mid-settlement could leave a payment half-recorded.
- Safe modification: (1) Log the call *before* settlement (with `paid: false`). (2) Update it to `paid: true` only if settlement succeeds. (3) Implement idempotency keys for duplicate settlement detection.
- Test coverage: Zero tests. High-impact bug.

**SSRF validation:**
- Files: `src/net/ssrf.ts`
- Why fragile: The IP parsing logic is manual and error-prone. Edge cases like IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) could slip through.
- Safe modification: Use a well-tested library (e.g., `ip` npm package) for IP range checks. Write tests for all RFC1918, loopback, link-local, and multicast ranges.
- Test coverage: Zero tests. Security-critical.

**Express error handling:**
- Files: `src/app.ts`, `src/routes/*.ts`
- Why fragile: Errors in async route handlers (e.g., `handleGateway`) that aren't awaited will crash the process. The `.catch(() => next())` pattern in app.ts (line 35) hides errors.
- Safe modification: (1) Wrap all async handlers in a try-catch + explicit error response. (2) Add a global error handler middleware. (3) Log all caught errors.
- Test coverage: Zero tests. Could manifest as sudden server crashes.

## Scaling Limits

**Flat JSON file storage:**
- Current capacity: ~2000 calls (capped in line 174 of `src/store.ts`). Endpoints and withdrawals are unbounded.
- Limit: File grows indefinitely; > 10MB file = slow reads/writes. No cleanup mechanism for old data.
- Scaling path: Migrate to Redis (already partially done) or PostgreSQL. Implement data retention policy (archive calls older than N days).

**In-memory nonce tracking (mock mode):**
- Current capacity: Limited by available RAM. A long-running server with thousands of settled payments accumulates nonces.
- Limit: No explicit cap or cleanup. Eventually hits memory limit.
- Scaling path: (1) Periodically flush old nonces (older than 1 hour). (2) Use a distributed cache (Redis) for nonces instead of in-memory Set.

**Serverless function cold-start latency:**
- Current capacity: Vercel functions auto-scale, but each cold start must `await store.load()` (line 141 in `src/store.ts`), which fetches the entire DB blob from Redis.
- Limit: >500ms for large DBs (1MB+).
- Scaling path: (1) Cache the DB blob in-memory for 10–30s. (2) Implement delta updates (only ship changed records since last load). (3) Shard data by tenant.

**Single dashboard polling instance:**
- Current capacity: Frontend polls every 2.5s, creating 24 requests/minute per user.
- Limit: 100 users = 2400 requests/minute, CPU-bound on API.
- Scaling path: WebSocket or server-sent events. Subscribe to updates instead of polling.

## Dependencies at Risk

**x402 protocol library version lock:**
- Risk: The codebase imports `x402` (line 2 in `src/x402/protocol.js`) as a fixed version. If the library has a security update or breaking change, upgrading requires code review of protocol changes.
- Impact: Stuck on old versions if not monitored, or forced upgrades if a critical bug is found.
- Migration plan: (1) Monitor x402 releases. (2) Test each upgrade in mock mode before deploying. (3) Document protocol dependencies in a PROTOCOL.md file.

**Viem library version:**
- Risk: Viem (used for EVM signing/verification) is a new library with a 2.x version. Breaking changes possible across minor versions.
- Impact: Signature verification could break silently if viem's EIP-712 implementation changes.
- Migration plan: Lock viem to exact version. Test EIP-712 recovery on each upgrade.

**jsonwebtoken library:**
- Risk: JWT library is mature but has had security issues in the past (e.g., algorithm confusion). The code uses `{ expiresIn: '7d' }` but doesn't validate the `alg` header on verify.
- Impact: Token validation could be bypassed if `alg` is switched to `none` by an attacker.
- Migration plan: (1) Add `algorithms: ['HS256']` to `jwt.verify()` call (line 85 in `src/auth.ts`). (2) Monitor JWT library security advisories.

## Missing Critical Features

**No data export / backup:**
- Problem: Sellers have no way to export their call history or earnings data. If Redis/filesystem fails, data is lost (file backend) or unrecoverable.
- Blocks: Regulatory compliance (audit logs), seller verification of earnings, data portability.

**No rate limiting on gateway:**
- Problem: Gated endpoints can be DOS'd by spam 402 requests.
- Blocks: Production deployment to public internet.

**No observability (logging, tracing):**
- Problem: Errors are caught and logged to console, but there's no structured logging, no error tracking (Sentry), no distributed tracing. Production incidents are blind.
- Blocks: Operating in production reliably.

**No idempotency support:**
- Problem: Payment settlement is not idempotent. If a client retries the same payment twice, both could be settled. In chain mode, this could result in double-charging.
- Blocks: Robust payment processing.

## Test Coverage Gaps

**Payment verification (mock and chain):**
- What's not tested: `verifyPayment()`, `mockVerify()`, `chainVerify()`. No test vectors for valid/invalid signatures, expired nonces, amount mismatches, or recipient changes.
- Files: `src/x402/facilitator.ts`, `src/x402/chain.ts`
- Risk: Critical crypto logic untested. A breaking change to EIP-712 domain or message structure goes unnoticed.
- Priority: **HIGH** — payment verification is the security core.

**Gateway proxy flow:**
- What's not tested: Full round-trip from 402 probe → signature → payment → settlement → upstream proxy. No tests for malformed payloads, SSRF bypass, upstream errors, or revenue splitting.
- Files: `src/routes/gateway.ts`
- Risk: Endpoint behavior can break without notice. Regressions in payment logic, endpoint validation, or revenue math ship silently.
- Priority: **HIGH** — core business logic.

**Store persistence:**
- What's not tested: File write/read, Redis sync/load, concurrent mutations, data corruption recovery.
- Files: `src/store.ts`
- Risk: Data loss, silent clobbering in Redis mode, partial writes on crash.
- Priority: **HIGH** — data integrity is critical.

**SSRF validation:**
- What's not tested: Private IP detection for IPv4, IPv6, IPv4-mapped IPv6. No edge case tests (e.g., `0.0.0.0`, `169.254.169.254` for cloud metadata).
- Files: `src/net/ssrf.ts`
- Risk: SSRF bypass exposes internal services.
- Priority: **HIGH** — security feature.

**Auth (SIWE):**
- What's not tested: Nonce generation, signature verification, token issuance, session cookie handling.
- Files: `src/auth.ts`
- Risk: Auth bypass, replay attacks, token forgery.
- Priority: **HIGH** — fundamental access control.

**Frontend components:**
- What's not tested: Form validation, API error handling, wallet connection, etc.
- Files: `web/src/components/*.tsx`, `web/src/pages/*.tsx`
- Risk: UI crashes, silent errors, user confusion.
- Priority: **MEDIUM** — user experience, not core security.

---

*Concerns audit: 2026-07-03*
