# Coding Conventions

**Analysis Date:** 2026-07-03

## Naming Patterns

**Files:**
- Backend modules: `camelCase.ts` (e.g., `auth.ts`, `revenue.ts`, `signer.ts`)
- Route handlers: `camelCase.ts` in `src/routes/` (e.g., `api.ts`, `gateway.ts`)
- Feature directories: lowercase hyphenated (e.g., `erc8004/`, `x402/`)
- React components: `PascalCase.tsx` (e.g., `GateForm.tsx`, `Dashboard.tsx`, `WalletButton.tsx`)
- Library/utility files: `camelCase.ts` (e.g., `auth.tsx`, `api.ts`, `wallet.tsx`)

**Functions:**
- Async handlers: prefixed verb + context (e.g., `handleGateway`, `recordCall`, `require402`)
- Utility functions: descriptive lowercase with underscores or camelCase (e.g., `splitRevenue`, `round6`, `targetUrl`, `subPathOf`)
- Type guards / validation: verb + type (e.g., `resolveAgent`, `verifyPayment`, `decodePaymentHeader`)
- React components: PascalCase (e.g., `GateForm`, `Card`, `Badge`)
- React hooks: `use` prefix (e.g., `useAuth`, `useWallet`)

**Variables:**
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `NONCE_TTL_MS`, `COOKIE`, `REDIS_KEY`, `HOP_BY_HOP`)
- Private module state: lowercase with dollar sign for React signals (not used) or plain camelCase (e.g., `nonces`, `db`, `redis`, `persistTimer`)
- Addresses: lowercase `address` or `ownerAddress` (enforced lowercase via `getAddress().toLowerCase()`)
- Immutable data: descriptive camelCase (e.g., `endpoint`, `payload`, `verification`)

**Types:**
- Interfaces: `PascalCase` without `I` prefix (e.g., `GatedEndpoint`, `CallRecord`, `Withdrawal`, `AppConfig`)
- Type aliases: `PascalCase` (e.g., `SettlementMode`, `Network`, `PaymentRequirements`)
- Union types for variant selections: `camelCase` values (e.g., `variant: 'primary' | 'secondary' | 'ghost' | 'outline'`)

## Code Style

**Formatting:**
- No linter configured (ESLint/Prettier absent)
- Manual formatting with consistent style observed:
  - 2-space indentation
  - Line length: ~100–120 characters (varies based on type)
  - Trailing commas in multi-line objects/arrays
  - Single quotes where used (rare; mostly template strings)

**Module imports:**
- ES modules (`"type": "module"` in package.json)
- `.js` file extensions explicitly added in imports: `import { config } from './config.js'`
- Node.js imports use full paths: `import fs from 'node:fs'` (not `'fs'`)

**Type annotations:**
- Full strict TypeScript enabled (`"strict": true` in tsconfig.json)
- Arrow functions for most handlers, named functions for utilities
- Return type annotations on public functions (e.g., `function newSignInMessage(address: string): string`)
- No `any` types; explicit types or generics used

## Import Organization

**Order:**
1. Node.js built-in modules (`import fs from 'node:fs'`)
2. Third-party libraries (`import express from 'express'`, `import { z } from 'zod'`)
3. Internal modules from same-level (relative paths: `./config.js`)
4. Deeply nested internal modules (`../config.js`, `../../auth.js`)
5. Type imports: `import type { ... }` (placed with other imports, no separate section)

**Path Aliases:**
- None configured; explicit relative paths used throughout
- Imports to sibling files: `./config.js`
- Imports to parent: `../auth.js`
- Absolute-looking paths only in Vite config (uses root-relative `'web'` directory)

**Barrel Files:**
- Not used; each module imports directly from source files
- Routes mounted individually in `src/app.ts`: `import { apiRouter } from './routes/api.js'`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations that might throw (e.g., JWT verify in `src/auth.ts` line 85)
- Graceful fallbacks: catch blocks often `.catch(() => null)` or `.catch(() => false)` to suppress errors (e.g., `verifyMessage` in `src/auth.ts`)
- Error recovery: null-return pattern for failed operations (e.g., `verifySignIn` returns `string | null`)
- Unsafe errors logged to console with context: `console.error('[store] redis load failed:', err)`
- HTTP error responses explicit: `res.status(402).json({ error: '...' })` with descriptive messages
- Validation errors structured: `issues: parsed.error.flatten()` from Zod parser (line 79, `src/routes/api.ts`)
- Silent failures in callbacks: `void store.load().then(...).catch(() => next())` in middleware (line 32, `src/app.ts`)

## Logging

**Framework:** `console.log` / `console.error` directly (no logger abstraction)

**Patterns:**
- Boot diagnostics with indented formatting: `console.log('  mode:         ...', config.mode)` (e.g., `src/server.ts`)
- Module-scoped context prefix: `console.error('[store] failed to persist db:', err)` (e.g., `src/store.ts` line 55)
- Sensitive data masked: never logs private keys, secrets, or token values
- Conditional logging: `/* eslint-disable no-console */` markers around boot console output (src/server.ts lines 9 and 42)
- No structured logging; plain strings with context appended

## Comments

**When to Comment:**
- Architectural decisions: why a pattern is chosen (e.g., "The gateway proxies arbitrary upstreams, so it needs the raw request body — mounted before any JSON parser")
- Non-obvious algorithm details: e.g., atomic write explanation in `src/store.ts` line 86
- Cross-file contracts: e.g., "Call once at the start of each request before any read" for `store.load()`
- Feature toggles/conditional logic: e.g., "In chain mode this account must hold USDC"

**JSDoc/TSDoc:**
- Functions with public APIs have JSDoc blocks (e.g., `/** Create a fresh sign-in message for the given address. */` in `src/auth.ts`)
- Parameters documented in comments inline when non-obvious
- Return types documented when necessary
- No `@param` / `@returns` tags observed; documentation is brief prose blocks

**Code comments:**
- Single-line comments mark sections: `// ── backend selection ───────────────────...` (decorative dividers)
- Inline comments explain "why" not "what": `// one-time use` (src/auth.ts line 58)
- Dense logic commented: e.g., EIP-712 structure explanation in `src/x402/protocol.ts`

## Function Design

**Size:** Functions kept small and focused; largest in codebase are ~70–120 lines
- Main handler functions like `handleGateway` (265 lines in router mount, but logic split into helper functions)
- Route handlers split business logic into helper functions (e.g., `require402`, `recordCall`)

**Parameters:**
- Destructured objects preferred: `{ onCreated, erc8004 }` in React components
- Type annotation on objects: explicit interface or inline type
- No positional parameters beyond 2–3 primitives; use objects for multiple options
- Optional parameters: `maxTimeoutSeconds?` pattern with TypeScript `?` operator

**Return Values:**
- Explicit return types on all public functions
- Async functions return `Promise<T>`
- Void functions for side effects: `async function recordCall(...): Promise<void>`
- Multiple returns via tuples uncommon; prefer objects: `{ platformFeeUsd, sellerEarningsUsd }`
- Nullable returns: `string | null` pattern explicit (e.g., `verifySignIn` in `src/auth.ts`)

## Module Design

**Exports:**
- Named exports (not default exports) for utilities and handlers
- Example: `export const apiRouter = Router()` (line 13, `src/routes/api.ts`)
- Single "public" export per module: routes, store interface, utilities
- Private module state (functions, constants) not exported

**Organization:**
- Each route file (`src/routes/*.ts`) exports one router
- Utility modules export multiple utility functions: `src/revenue.ts` has `round6` + `splitRevenue`
- Configuration module `src/config.ts` exports `config` object + feature flags (`isLive`, `erc8004Enabled`)
- Store interface split: single `store` object with methods (e.g., `store.load()`, `store.addEndpoint()`)

**Dependencies:**
- Circular imports not observed; always downward dependencies (e.g., routes import config, not reverse)
- Module-level singletons: `db` in `src/store.ts`, `nonces` in `src/auth.ts`, `redis` cache in `src/store.ts`
- Late initialization for expensive resources: `getRedis()` lazy-loads Redis client on first use

## React Conventions (Frontend)

**Component Structure:**
- Functional components with hooks (no class components)
- Props destructured in function signature: `function GateForm({ onCreated, erc8004 }: { ... })`
- State initialized with `useState`: each piece of state its own call (e.g., `const [url, setUrl] = useState('')`)
- Effects with `useEffect`: dependency arrays explicit

**Styling:**
- Tailwind CSS utility classes: `className="flex items-center gap-2"`
- No CSS-in-JS or styled components
- Conditional classes via `cx()` helper: `cx(btn(variant, size), className)`
- Responsive prefixes: `sm:grid-cols-4` pattern

**API Calls:**
- Centralized in `web/src/lib/api.ts`
- Generic `req<T>()` function wraps fetch with error handling
- All endpoints return typed responses: `req<Endpoint[]>('/api/endpoints')`
- Error messages extracted from JSON body: `(body as { error?: string }).error`
- Credentials: `credentials: 'include'` for cookie-based auth

**Async/Await:**
- Promise.all for parallel requests: `await Promise.all([api.endpoints(), api.stats(), api.calls(30)])`
- Try-finally for cleanup (e.g., `finally { setLoadingExamples(false) }`)
- Silent error suppression: `.catch(() => undefined)` when error state isn't needed

---

*Convention analysis: 2026-07-03*
