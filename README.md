# 🛡️ GateKeep — Stripe for AI agent API calls

Wrap **any** REST API behind an [x402](https://x402.org) payment gate in one click.
Paste your endpoint, set a price-per-call, and get a new gated URL. AI agents that
hit it **auto-pay in USDC and get the response** — no Stripe, no invoices, no humans
in the loop. GateKeep takes a cut of every call.

> 402 Payment Required was the one HTTP status code the web never shipped. x402 finally
> turns it on — and agents, unlike humans, are happy to pay $0.001 to call an API.

---

## Why this exists

AI agents are becoming the dominant consumers of APIs, but the web has no native way
for them to pay per request. API owners are stuck with API keys, dashboards, and
monthly invoices that no agent can sign up for.

GateKeep is the missing payment layer:

| Without GateKeep | With GateKeep |
| --- | --- |
| Sign up, get an API key, add a credit card | Agent just calls the URL |
| Monthly plans, overage billing, invoices | Pay-per-call, settled in USDC, instantly |
| Humans in the loop | Fully autonomous |

You (the platform) earn a configurable cut of every single call — this is
**Stripe-for-agents**, and the take rate is your business model.

---

## Quickstart

```bash
npm install        # install deps (needs Node 18+)
npm run dev        # API on :4021, dashboard on :5173
```

Open **http://localhost:5173**, then:

1. **Paste an endpoint** (e.g. `https://api.github.com/zen`), set a price, click **Create gate**.
2. Copy your new gated URL (`http://localhost:4021/g/<id>`).
3. Click **▶ Run agent** to watch an AI agent discover the 402, sign a USDC payment,
   and unlock the response — live, step by step.

Or pay a gate from the terminal with the bundled agent:

```bash
npm run agent                      # auto-pays the first gated endpoint
npm run agent -- <gated-url>       # pay a specific gate
npm run agent -- <gated-url> --lib # use the official x402-fetch client
```

> **Zero setup.** Out of the box GateKeep runs in **mock mode**: it signs *real*
> EIP-712 / EIP-3009 payment authorizations and verifies the signatures
> cryptographically, but *simulates* on-chain settlement — so the entire flow works
> offline with no wallet and no funds.

### Run it with REAL on-chain settlement (Docker + Anvil)

To watch real USDC actually move on a blockchain, bring up the full stack — a
local [Anvil](https://book.getfoundry.sh/anvil/) chain, an EIP-3009 USDC token,
and GateKeep in `chain` mode — with one command:

```bash
docker compose up --build      # needs Docker running; uses host ports 4021 + 8545
```

This starts three services:

1. **anvil** — a local EVM chain (chain id `43113`, mimicking Avalanche Fuji)
2. **deployer** — deploys [`MockUSDC`](contracts/MockUSDC.sol) and mints test USDC to the agent
3. **gatekeep** — the app, settling each call on-chain via its own facilitator

Open **http://localhost:4021**, click **Run agent**, and every payment is a real
`transferWithAuthorization` transaction — the agent's USDC balance drops, the
platform's rises, and you get a real tx hash. Anvil's RPC is on `:8545`:

```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "balanceOf(address)(uint256)" 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://localhost:8545      # the agent's on-chain USDC balance
```

> Prefer to run it natively (Foundry installed)? `npm run chain:anvil` in one
> terminal, then `DOTENV_CONFIG_PATH=.env.chain npm run chain:deploy && npm run dev:chain`.

**📚 Docs:** [Architecture & how x402 works](docs/ARCHITECTURE.md) ·
[Deploy to Avalanche](docs/DEPLOY.md)

---

## How it works

```
  AI agent                  GateKeep  /g/:id              Your upstream API
  ────────                  ──────────────────            ─────────────────
     │  GET /g/:id                  │                              │
     │ ───────────────────────────►│                              │
     │  402 Payment Required        │   (no X-PAYMENT header)      │
     │ ◄───────────────────────────│   { accepts: [requirements]} │
     │                              │                              │
     │  sign EIP-3009 USDC auth     │                              │
     │  (gasless, off-chain)        │                              │
     │                              │                              │
     │  GET /g/:id  +  X-PAYMENT    │                              │
     │ ───────────────────────────►│  verify signature            │
     │                              │ ──── proxy request ────────► │
     │                              │ ◄─── 200 + body ──────────── │
     │                              │  settle USDC (facilitator)   │
     │  200 OK + X-PAYMENT-RESPONSE │  split revenue: you + seller │
     │ ◄───────────────────────────│                              │
```

The protocol is the real [x402 spec](https://github.com/coinbase/x402): an
`exact`-scheme USDC payment, signed as an EIP-3009 `transferWithAuthorization` over
EIP-712 typed data, carried in a base64 `X-PAYMENT` header, verified and settled by a
facilitator. GateKeep speaks it faithfully so any standard x402 client
(`x402-fetch`, `x402-axios`, CDP AgentKit, …) can pay your gates unmodified.

---

## Architecture

```
contracts/
  MockUSDC.sol         minimal EIP-3009 USDC (real transferWithAuthorization)
scripts/
  deploy.ts            deploy MockUSDC + mint test USDC to the agent
src/
  server.ts            Express app: gateway + API + facilitator + static dashboard
  config.ts            env / mode / fee / wallet / chain config
  store.ts             JSON-file persistence (endpoints + call ledger)
  revenue.ts           platform-cut / seller-payout math
  routes/
    gateway.ts         the /g/:id dynamic x402 proxy — the core
    api.ts             registry CRUD, stats, and the agent-playground simulator
    facilitator.ts     GateKeep's own x402-compatible facilitator endpoints
  net/
    ssrf.ts            blocks gates pointed at private / metadata addresses
  x402/
    protocol.ts        build PaymentRequirements, encode/decode X-PAYMENT, EIP-712 domain
    signer.ts          agent-side: sign an EIP-3009 USDC authorization
    facilitator.ts     verify + settle — dispatches to mock or chain
    chain.ts           on-chain facilitator (viem): balance/nonce checks + settle tx
  agent/
    demo-agent.ts      standalone "AI agent" CLI that pays a gate
web/                   Vite + React + Tailwind dashboard
docker-compose.yml     anvil + deploy + app, for real on-chain settlement
```

**Dynamic pricing.** Unlike the stock `x402-express` middleware (which gates a static
route map), GateKeep builds `PaymentRequirements` per-request from the endpoint the
user registered — so every gated URL has its own price, looked up at call time.

Full design walkthrough — including what x402 is and how settlement works — is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Settlement modes

One switch, `X402_MODE`, decides **how** a payment settles. Everything else — the
protocol, signing, the wire format — is identical.

| | `mock` (default) | `chain` |
| --- | --- | --- |
| EIP-712 signing | ✅ real | ✅ real |
| Signature verification | ✅ real (recovers signer) | ✅ real |
| On-chain settlement | simulated (deterministic tx hash) | ✅ real USDC transfer + tx hash |
| Replay protection | in-memory nonce set | the token's on-chain `authorizationState` |
| Needs an RPC / funded wallet | ❌ no | ✅ yes |
| Runs offline | ✅ yes | ❌ needs a chain |
| Use it for | demos, dev, CI | **Anvil locally, Avalanche / Base in prod** |

`chain` mode is RPC-agnostic — the same code settles against a local Anvil node
(`docker compose up`, above) or against Avalanche in production. Going live is a
config change, not a code change.

**Avalanche Fuji testnet, in 3 commands:**

```bash
npm run fuji:setup     # generates wallets, prints the facilitator address + faucet link
# → fund that address with test AVAX at https://faucet.avax.network
npm run fuji:deploy    # deploy MockUSDC to Fuji + mint USDC to the agent
npm run fuji:start     # run GateKeep against Avalanche Fuji
```

Full walk-through (incl. real Circle USDC + mainnet): **[docs/DEPLOY.md](docs/DEPLOY.md)**.
All the knobs are in [`.env.example`](.env.example) (mock), [`.env.chain`](.env.chain)
(anvil), and [`.env.fuji.example`](.env.fuji.example) (Fuji).

---

## Integrating as an agent developer

Any x402 client works. With the official `x402-fetch`:

```ts
import { wrapFetchWithPayment } from 'x402-fetch';
import { createSigner } from 'x402/types';

const signer = await createSigner('base-sepolia', process.env.AGENT_KEY);
const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// Just fetch — payment happens automatically on 402.
const res = await fetchWithPay('http://localhost:4021/g/<id>');
console.log(await res.json());
```

---

## HTTP API

| Method | Path | Purpose |
| --- | --- | --- |
| `ANY` | `/g/:id` | The gated proxy. 402 without payment, proxies upstream with it. |
| `GET` | `/api/config` | Runtime config (mode, network, fee, platform wallet). |
| `GET` | `/api/endpoints` | List gated endpoints + per-endpoint stats. |
| `POST` | `/api/endpoints` | Create a gate `{ name, upstreamUrl, method, priceUsd }`. |
| `PATCH` | `/api/endpoints/:id` | Update price / pause / rename. |
| `DELETE` | `/api/endpoints/:id` | Remove a gate. |
| `POST` | `/api/endpoints/:id/simulate` | Run the full pay round-trip, return a transcript. |
| `GET` | `/api/stats` | Platform totals (your revenue, gross volume, payouts). |
| `GET` | `/api/calls` | Recent call ledger. |
| `POST` | `/facilitator/verify` · `/settle` | GateKeep's own x402 facilitator surface. |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (`:4021`) + dashboard (`:5173`) with hot reload (mock mode) |
| `npm run build` | Build the dashboard to `web/dist` |
| `npm start` | Production: serve API + built dashboard on `:4021` |
| `npm run agent` | Standalone agent that pays a gate |
| `npm run seed` | Re-add the example endpoints |
| `docker compose up --build` | Full stack with **real on-chain settlement** (anvil + USDC + app) |
| `npm run chain:anvil` | Run a local Anvil chain (native, chain id 43113) |
| `npm run chain:deploy` | Deploy MockUSDC + mint test USDC to the agent |
| `npm run dev:chain` | Dev server in `chain` mode (needs anvil + a deploy) |
| `npm run contracts:build` | Recompile `MockUSDC.sol` → `contracts/out/` |
| `npm run fuji:setup` | Generate wallets + wire **Avalanche Fuji** testnet (`.env.fuji`) |
| `npm run fuji:deploy` | Deploy MockUSDC to Fuji + mint to the agent |
| `npm run fuji:start` | Run GateKeep against Avalanche Fuji |

### Troubleshooting

If `npm run dev`/`build` fails with *"Cannot find native binding"* (a known npm
[optional-dependency bug](https://github.com/npm/cli/issues/4828)), reinstall:

```bash
rm -rf node_modules package-lock.json && npm install
```

---

Built in a day with the [`x402`](https://www.npmjs.com/package/x402) package. Not affiliated with Coinbase or Stripe.
