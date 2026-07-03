# Technology Stack

**Analysis Date:** 2026-07-03

## Languages

**Primary:**
- TypeScript 5.9.3 - Backend server, frontend components, utilities, and smart contract compilation
- JavaScript (ES2022) - Runtime target for compiled code

**Secondary:**
- Solidity - Smart contracts for USDC token (`contracts/MockUSDC.sol`) and ERC-8004 registries (`contracts/ERC8004.sol`)
- HTML/CSS - Static frontend assets

## Runtime

**Environment:**
- Node.js 22.10.5 (inferred from `@types/node` version)
- Browser runtime for React frontend (modern browsers with ES2022 support)

**Package Manager:**
- npm 10+ (inferred from package-lock.json format)
- Lockfile: `package-lock.json` present and committed

## Frameworks

**Core:**
- Express 4.21.2 - Backend HTTP server and REST API
- React 18.3.1 - Frontend UI framework
- Vite 6.0.7 - Frontend build tool and dev server

**Testing:**
- Not configured (no test runner dependencies detected in package.json)

**Build/Dev:**
- Tailwind CSS 4.0.0 - Utility-first CSS framework for styling
- @tailwindcss/vite 4.0.0 - Vite plugin for Tailwind CSS
- Vite React plugin 4.3.4 - JSX/TSX support in Vite
- tsx 4.19.2 - TypeScript runner for Node.js (dev scripts, server in development)
- TypeScript Compiler 5.9.3 - Compiles server code for Vercel (tsconfig.server.json)
- Concurrently 9.1.2 - Runs api and web dev servers in parallel
- Solc (solidity compiler) - Custom npm script `contracts:build` for smart contracts

## Key Dependencies

**Critical:**
- viem 2.21.55 - Ethereum/EVM interaction library; used for EIP-712 signing, signature verification, smart contract calls, on-chain settlement
- x402 1.2.0 - x402 payment protocol types and utilities; defines payment scheme and settlement semantics
- x402-fetch 1.2.0 - Fetch wrapper for x402 payment rail integration

**Infrastructure:**
- @upstash/redis 1.38.0 - Redis client for Vercel/serverless persistence; gates switching between local JSON file (`data/db.json`) and remote Redis (Upstash)
- @vercel/node 5.8.22 - Vercel Node.js runtime utilities for serverless functions

**Web:**
- react-router-dom 6.30.4 - Client-side routing
- nanoid 5.0.9 - ID generation (10-char IDs for call records)
- zod 3.24.1 - Runtime schema validation

**Crypto & Auth:**
- jsonwebtoken 9.0.3 - JWT signing and verification for session management
- viem/accounts - Private key account abstraction for signing and transaction building

**Network & HTTP:**
- cors 2.8.5 - CORS middleware for Express
- cookie-parser 1.4.7 - HTTP cookie parsing and setting
- express.raw() - Built-in Express body parser for proxy use case (payment gateway proxies upstream responses)

## Configuration

**Environment:**
- `.env.example` - Development environment template (not read, exists)
- `.env.fuji` - Avalanche Fuji testnet configuration
- `.env.fuji.example` - Fuji config template
- Resolved via `dotenv` 16.4.5 at import time (`import 'dotenv/config'`)
- Supports dual environment selection: local mock mode or chain mode (Avalanche Fuji)

**Key configs required (from `src/config.ts`):**
- `PORT` - Server port (default: 4021)
- `X402_MODE` - Settlement mode: 'mock' or 'chain' (default: 'mock')
- `X402_NETWORK` - Network label for dashboard (default: 'base-sepolia' or 'avalanche-fuji')
- `PUBLIC_BASE_URL` - Public origin for gated URLs (used in payment headers)
- `PLATFORM_WALLET` - USDC receiving address for all payments
- `PLATFORM_PRIVATE_KEY` - Platform wallet signing key (chain mode only)
- `JWT_SECRET` - Session JWT signing secret
- `PLATFORM_FEE_BPS` - Platform take rate in basis points (default: 1000 = 10%)
- `AGENT_PRIVATE_KEY` - Demo agent signing key (defaults to public test key)
- `DATA_DIR` - Local data directory for JSON store (default: 'data')
- `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` - Redis endpoint (Vercel serverless)
- `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN` - Redis auth token
- `RPC_URL` - EVM JSON-RPC endpoint (chain mode, defaults to Avalanche Fuji)
- `CHAIN_ID` - EVM chain ID (default: 43113 = Avalanche Fuji)
- `USDC_ADDRESS` - EIP-3009 USDC token address (set by `npm run fuji:deploy`)
- `FACILITATOR_PRIVATE_KEY` - Submitter of settlement transactions
- `IDENTITY_REGISTRY` - ERC-8004 identity registry contract (optional, enables trustless agent features)
- `REPUTATION_REGISTRY` - ERC-8004 reputation registry contract (optional)

**Build:**
- `vite.config.ts` - Frontend build configuration (React, Tailwind, dev proxy)
- `tsconfig.json` - Frontend/general TypeScript configuration (ES2022, ESNext, strict mode)
- `tsconfig.server.json` - Server build configuration (Node.js ESM, compiles src/ → dist/ for Vercel)
- `vercel.json` - Vercel deployment config (build command, output directory, rewrites, function timeout)

## Platform Requirements

**Development:**
- Node.js 22.x or compatible
- npm lockfile up-to-date
- Bash/Zsh (for npm scripts)
- Solidity compiler (solc) for contract builds (invoked via `contracts:build`)

**Production:**
- Deployment target: **Vercel serverless Node.js**
  - Built frontend: `web/dist/` (CDN-served static assets)
  - Backend function: `api/index.ts` (Vercel serverless handler)
  - Max function duration: 30 seconds
  - Entry point: Express app imported from compiled `dist/app.js`
- Fallback option: Any Node.js host (Docker, Render, self-hosted) using `npm run start`
- Stateless or long-running: Express app supports both modes
  - **Serverless (Vercel):** Uses Upstash Redis for persistence
  - **Long-running (local/Render):** Uses local JSON file `data/db.json` with atomic writes

---

*Stack analysis: 2026-07-03*
