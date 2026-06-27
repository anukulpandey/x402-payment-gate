# 🛡️ GateKeep — Stripe for AI agent API calls

Wrap **any** REST API behind an [x402](https://x402.org) payment gate in one click.
Paste your endpoint, set a price-per-call, and get a new gated URL. AI agents that
hit it **auto-pay in USDC and get the response** — no Stripe, no invoices, no humans
in the loop. GateKeep takes a cut of every call.

It combines the two primitives of agentic payments: **x402** for the payment rail,
and **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)** (Trustless Agents) for
on-chain identity + reputation — so a gate can require a *verified* agent and tier
access by *reputation*, and every paid call writes feedback that builds that agent's
on-chain track record. Payments that are also identity- and reputation-aware.

> 402 Payment Required was the one HTTP status code the web never shipped. x402 finally
> turns it on — and agents, unlike humans, are happy to pay $0.001 to call an API.
>
> Built for the **Avalanche "Agentic Payments" Speedrun** — live on Fuji, x402 + ERC-8004.

---

## Demo

An AI agent paying a gated API from the terminal — `402 → sign → 200`, settled on-chain:

![Agent paying a gate from the CLI](docs/images/agent-demo.gif)

| Landing | Seller dashboard |
| --- | --- |
| [![Landing](docs/images/landing.png)](docs/images/landing.png) | [![Dashboard](docs/images/dashboard.png)](docs/images/dashboard.png) |

| Agent playground (live pay round-trip) | In-app docs |
| --- | --- |
| [![Playground](docs/images/playground.png)](docs/images/playground.png) | [![Docs](docs/images/docs.png)](docs/images/docs.png) |

More: [how it works](docs/images/how-it-works.png) · [pricing](docs/images/pricing.png).

---

## Deployed on Avalanche Fuji (chain id 43113)

GateKeep runs live on the Avalanche **Fuji testnet**. Three contracts are deployed and
every payment/withdrawal/attestation is a real on-chain transaction, verifiable on
[Snowtrace](https://testnet.snowtrace.io).

### Smart contracts

| Contract | Address | What it does |
| --- | --- | --- |
| **MockUSDC** (EIP-3009) | [`0x00ddb787…60cb937`](https://testnet.snowtrace.io/address/0x00ddb7879d626fa6365269dc68c6cb26260cb937) | The USDC test token every payment settles in. Implements `transferWithAuthorization` — gasless, signature-based transfers — the **exact mechanism real Circle USDC uses**, so swapping in real USDC needs no code change. |
| **IdentityRegistry** (ERC-8004) | [`0xde9786b2…7EA7f73`](https://testnet.snowtrace.io/address/0xde9786b26603a54e35749922495d34fca7ea7f73) | ERC-721 of agent identities. An agent calls `register()` → gets an `agentId` and binds its payment wallet, so a gate can resolve a paying wallet to a known, verifiable agent. |
| **ReputationRegistry** (ERC-8004) | [`0x34c2d005…05965421`](https://testnet.snowtrace.io/address/0x34c2d005e7a3fc907432f5446aaf077f05965421) | Stores `giveFeedback` attestations about each agent (`getSummary` reads count/score). GateKeep writes a positive attestation after every successful paid call → the agent's reputation grows. |

Source: [`contracts/MockUSDC.sol`](contracts/MockUSDC.sol) and [`contracts/ERC8004.sol`](contracts/ERC8004.sol)
(Identity + Reputation in one file). Compiled with `solc`, deployed with `viem`
(`scripts/deploy.ts`, `scripts/deploy-erc8004.ts`).

### Key accounts (testnet wallets)

Auto-generated test wallets — their private keys live in the gitignored `.env.fuji`;
the addresses are public and viewable on Snowtrace. These are **EOAs (wallets), not contracts**:

| Role | Address | What it does |
| --- | --- | --- |
| **Facilitator** | `0x8c32F8…319677` | Submits x402 settlement txs + deploys contracts; pays the AVAX gas. |
| **Platform treasury** | `0xFbA75e…9427a5` | Receives the gross USDC from every call; signs seller withdrawal payouts. |
| **Demo agent** | `0x0cECD9…87A25F` | The example paying agent (registered as **agentId 1**); holds USDC and pays gates. |

> Production: swap MockUSDC for Circle's real USDC (no deploy needed) and keep your own
> ERC-8004 registries — only the env addresses change. Full guide: [docs/DEPLOY.md](docs/DEPLOY.md).

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

GateKeep is a full product: a marketing site (`/`, `/how-it-works`, `/docs`,
`/about`, `/contact`), a **wallet-based login**, and a seller **dashboard** (`/app`).

## Quickstart

```bash
npm install        # install deps (needs Node 18+)
npm run dev        # API on :4021, site on :5173
```

Open **http://localhost:5173**, then:

1. **Connect your wallet** (MetaMask) and sign in — your wallet is your account and
   your payout address. Signing is free and gasless (Sign-In with Ethereum).
2. In the **dashboard** (`/app`), **paste an endpoint** (e.g. `https://api.github.com/zen`),
   set a price, click **Create gate** — or hit **Load examples**.
3. Copy your gated URL (`http://localhost:4021/g/<id>`).
4. Click **▶ Run agent** to watch an AI agent discover the 402, sign a USDC payment,
   and unlock the response — live, step by step. You earn 90% of every call.
5. Hit **Withdraw** to pay your earned USDC on-chain to your wallet — a real
   transfer you can verify on Snowtrace.

### Test the agent without the UI

Copy a gated URL from the dashboard, then pay it from the terminal with the
bundled agent (the GIF above). This is the easiest way to confirm an agent can
pay your gate end-to-end:

```bash
# mock mode (offline):
npm run agent  -- http://localhost:4021/g/<id>

# Avalanche Fuji (real on-chain USDC settlement):
npm run fuji:agent -- http://localhost:4021/g/<id>

# use the official x402-fetch client instead of the hand-rolled signer:
npm run fuji:agent -- http://localhost:4021/g/<id> --lib
```

You'll see the `402 → sign EIP-3009 → 200` round-trip, the settlement tx hash,
and the upstream response. It uses the agent wallet from your env
(`AGENT_PRIVATE_KEY`), which must hold USDC in chain mode.

You can also just `curl` the gate to see the raw 402, or point **any** standard
x402 client at the URL — see [Integrating as an agent developer](#integrating-as-an-agent-developer).

> **Zero setup.** Out of the box GateKeep runs in **mock mode**: it signs *real*
> EIP-712 / EIP-3009 payment authorizations and verifies the signatures
> cryptographically, but *simulates* on-chain settlement — so the entire flow works
> offline with no wallet and no funds.

### Run it with REAL on-chain settlement (Avalanche Fuji)

To watch real USDC actually move on a blockchain, run GateKeep in `chain` mode
against the **Avalanche Fuji** testnet. Three commands:

```bash
npm run fuji:setup     # generates wallets → .env.fuji, prints the facilitator
                       # address + the faucet link
# → fund that facilitator address with test AVAX: https://faucet.avax.network
npm run fuji:deploy    # deploys MockUSDC to Fuji + mints USDC to the agent
npm run fuji:start     # runs GateKeep against Fuji → http://localhost:4021
```

Open the dashboard, click **Run agent**, and every payment is a real
`transferWithAuthorization` transaction — the agent's USDC balance drops, the
platform's rises, and you get a tx hash you can open on
[Snowtrace testnet](https://testnet.snowtrace.io). Full guide (incl. real Circle
USDC + mainnet): **[docs/DEPLOY.md](docs/DEPLOY.md)**.

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
  setup-fuji.ts        generate wallets + wire Avalanche Fuji (.env.fuji)
src/
  server.ts            Express app: gateway + API + auth + facilitator + SPA
  config.ts            env / mode / fee / wallet / chain / jwt config
  auth.ts              Sign-In with Ethereum: nonce, signature verify, JWT session
  store.ts             JSON-file persistence (owner-scoped endpoints + ledger)
  revenue.ts           seller-earnings / platform-fee math
  routes/
    gateway.ts         the /g/:id dynamic x402 proxy — the core (public)
    auth.ts            /api/auth/* — nonce, verify, me, logout (SIWE)
    api.ts             owner-scoped CRUD, stats, the agent-playground simulator
    facilitator.ts     GateKeep's own x402-compatible facilitator endpoints
  net/ssrf.ts          blocks gates pointed at private / metadata addresses
  x402/
    protocol.ts        build PaymentRequirements, encode/decode X-PAYMENT, EIP-712 domain
    signer.ts          agent-side: sign an EIP-3009 USDC authorization
    facilitator.ts     verify + settle — dispatches to mock or chain
    chain.ts           on-chain facilitator (viem): balance/nonce checks + settle tx
  agent/demo-agent.ts  standalone "AI agent" CLI that pays a gate
web/                   Vite + React + Tailwind product site
  src/lib/             wallet (MetaMask), auth (SIWE), typed API client
  src/pages/           Landing, HowItWorks, About, Contact, Docs, Dashboard
  src/components/      Navbar, Footer, WalletButton, design-system + dashboard UI
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
| Use it for | demos, dev, CI | **Avalanche Fuji / Base / any EVM in prod** |

`chain` mode is RPC-agnostic — the same code settles against Avalanche Fuji,
Avalanche mainnet, Base, or any EVM chain with an EIP-3009 USDC. Going live is a
config change, not a code change — see the Fuji quickstart above and the full
walk-through (incl. real Circle USDC + mainnet) in **[docs/DEPLOY.md](docs/DEPLOY.md)**.
All the knobs are in [`.env.example`](.env.example) (mock) and
[`.env.fuji.example`](.env.fuji.example) (chain / Fuji).

---

## Identity & reputation — ERC-8004

x402 settles the payment; **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)**
(Trustless Agents) answers *who* is paying and *whether to trust them*. GateKeep
deploys ERC-8004 **Identity** + **Reputation** registries on Fuji and makes every
gate optionally **identity- and reputation-aware**:

- **Verified agents only** — a gate can require the caller to hold a registered
  ERC-8004 identity (an agentId NFT with a bound payment wallet). The gateway
  resolves the paying wallet → agentId; unregistered agents get a `403`.
- **Reputation tiers** — a gate can require a minimum reputation (number of prior
  on-chain attestations). Low-rep agents are turned away until they earn trust.
- **Feedback loop** — after each successful paid call, the gate writes on-chain
  `giveFeedback` about the agent → its reputation grows, unlocking higher tiers.

[![Identity- and reputation-aware gates](docs/images/erc8004.png)](docs/images/erc8004.png)

```bash
npm run fuji:erc8004    # deploy the registries + register the demo agent
```

Verified end-to-end on Fuji: an unregistered (but funded) agent → identity-gated
gate returns `403 agent_identity_required`; a registered agent is served and its
reputation climbs `0 → 3` across paid calls, unlocking a `reputation 3+` gate.
Contracts: [`contracts/ERC8004.sol`](contracts/ERC8004.sol); integration:
[`src/erc8004/registry.ts`](src/erc8004/registry.ts) + the gate policy in
[`src/routes/gateway.ts`](src/routes/gateway.ts). Design notes in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#12-erc-8004--identity--reputation).

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
| `ANY` | `/g/:id` | The gated proxy. 402 without payment, proxies upstream with it. **Public.** |
| `GET` | `/api/config` | Public runtime config (mode, network, chain id, fee). |
| `POST` | `/api/auth/nonce` | Get a Sign-In-with-Ethereum message to sign. |
| `POST` | `/api/auth/verify` | Verify the signature → start a session (cookie). |
| `GET` | `/api/auth/me` · `POST /logout` | Session identity / sign out. |
| `GET` | `/api/endpoints` 🔒 | Your gated endpoints + per-endpoint stats. |
| `POST` | `/api/endpoints` 🔒 | Create a gate `{ name, upstreamUrl, method, priceUsd }`. |
| `PATCH` · `DELETE` | `/api/endpoints/:id` 🔒 | Update / remove a gate you own. |
| `POST` | `/api/examples` 🔒 | Add the example endpoints to your account. |
| `POST` | `/api/endpoints/:id/simulate` 🔒 | Run the full pay round-trip, return a transcript. |
| `GET` | `/api/stats` · `/api/calls` 🔒 | Your earnings, volume, and call ledger. |
| `POST` | `/api/withdraw` 🔒 | Pay your earned USDC on-chain to your wallet. |
| `POST` | `/facilitator/verify` · `/settle` | GateKeep's own x402 facilitator surface. |

🔒 = requires a signed-in wallet (session cookie).

### Wallet login (Sign-In with Ethereum)

There are no passwords. The dashboard asks your wallet for a one-time message, you
sign it (free, gasless), and the server verifies the signature and starts a session.
Your wallet address **is** your account — and your USDC payout address. Each seller
sees only their own gates, calls, and earnings.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (`:4021`) + dashboard (`:5173`) with hot reload (mock mode) |
| `npm run build` | Build the dashboard to `web/dist` |
| `npm start` | Production: serve API + built dashboard on `:4021` |
| `npm run agent` | Standalone agent that pays a gate |
| `npm run fuji:setup` | Generate wallets + wire **Avalanche Fuji** testnet (`.env.fuji`) |
| `npm run fuji:deploy` | Deploy MockUSDC to Fuji + mint to the agent |
| `npm run fuji:erc8004` | Deploy ERC-8004 Identity + Reputation registries + register the agent |
| `npm run fuji:start` | Run GateKeep against Avalanche Fuji |
| `npm run fuji:agent` | Pay a Fuji gate from the terminal |
| `npm run contracts:build` | Recompile `MockUSDC.sol` → `contracts/out/` |

### Troubleshooting

If `npm run dev`/`build` fails with *"Cannot find native binding"* (a known npm
[optional-dependency bug](https://github.com/npm/cli/issues/4828)), reinstall:

```bash
rm -rf node_modules package-lock.json && npm install
```

---

## Presenting GateKeep — read-before-you-present cheat sheet

Everything you need to explain and demo the project, end to end. Read this top-to-bottom
and you can present it cold.

### 30-second pitch
GateKeep is **"Stripe for AI agent API calls."** A developer wraps any REST API behind a
pay-per-call paywall in one click. When an AI agent calls the gated URL it gets an HTTP 402,
**auto-pays in USDC over the x402 protocol**, and the call unlocks — **settled on-chain on
Avalanche**. On top of that we add **ERC-8004**, so a gate can require a *verified* agent
identity and tier access by *reputation*. **x402 is the payment rail; ERC-8004 is the trust
layer** — both Speedrun primitives, combined.

### The problem
APIs were built for humans with credit cards: sign up, copy an API key, get billed monthly.
Autonomous AI agents can't do any of that — but they *can* pay per request, if the web asks
them. x402 turns the long-dormant HTTP `402 Payment Required` into that ask; GateKeep makes it
one click to monetize an API for agents (and take a cut, like Stripe).

### What happens on one paid call (the core flow)
1. Agent calls the gated URL `…/g/:id` with **no payment**.
2. GateKeep replies **`402 Payment Required`** + a quote: price, token (USDC), network, pay-to address.
3. Agent signs an **EIP-3009 `transferWithAuthorization`** — a *gasless* USDC payment (a signature, not a tx).
4. Agent retries with an **`X-PAYMENT`** header.
5. GateKeep **verifies** the signature, **resolves the agent's ERC-8004 identity + reputation**, and enforces the gate policy (a `403` if unverified / under the reputation bar).
6. GateKeep **proxies** the request to your real API, **settles the USDC on-chain** (its facilitator pays the gas), and returns the response + a settlement receipt header.
7. It **writes on-chain feedback** about the agent (reputation ++) and credits your earnings (you keep **90%**, GateKeep takes **10%**). You **withdraw** earnings on-chain to your wallet anytime.

### Live demo flow (what to click + say)
1. **Landing page** — the pitch + the `402 → pay → 200` visual.
2. **Connect wallet** (MetaMask) → sign in. It's **SIWE** (Sign-In with Ethereum): you sign a message, gasless. Your wallet *is* your account and payout address.
3. **Create a gate** — paste an endpoint, set a price, copy the gated URL.
4. **Run agent** (playground) — watch the live `402 → sign → settle → 200`, with a real **tx hash on Snowtrace**.
5. **ERC-8004** — flip a gate to "verified agents only" / "reputation 2+": show an *unregistered* agent get **403**, a *registered* agent get served, and reputation **climbing 0 → 3**, which unlocks the reputation-gated gate.
6. **Withdraw** — cash earned USDC to your wallet, on-chain, verifiable on Snowtrace.
7. *(optional)* **CLI** — `npm run fuji:agent -- <gated-url>` pays a gate from the terminal.

### Why it fits the Speedrun
- **x402** — per-call USDC settlement over HTTP 402, no accounts or API keys (the "x402 Gated API" idea).
- **ERC-8004** — require a registered identity, tier by reputation, write feedback after each call (the bonus: *payments that are also identity- and reputation-aware*).
- **Avalanche** — deployed and settling on **Fuji C-Chain (43113)**; mainnet-ready by config.

### Honest answers to likely judge questions
- **"Why would an agent pay your URL instead of calling the API directly?"** A paywall only has value if the origin isn't otherwise reachable — the seller publishes *only* the gated URL and keeps the origin private/credentialed (GateKeep is the only door; with ERC-8004, agents *discover* the gated URL, not the origin). The seeded demo APIs are public, purely to show the flow. The next step to enforce this for credentialed origins is per-gate upstream-credential injection (GateKeep adds the seller's API key only on a paid request).
- **"Is the identity sybil-proof?"** No — `register()` is permissionless, so `requireIdentity` only means "has an identity." **Reputation** is the stronger gate because it must be *earned*; full sybil/quality resistance needs staking + the ERC-8004 **Validation Registry** (anticipated by the spec, not in this MVP).
- **"How is reputation computed?"** The gate writes a positive attestation after each successful paid call, so reputation ≈ count of completed paid calls — a real "non-throwaway agent" signal, but basic (farmable by paying). Richer feedback (distinct counterparties, quality scores) is the upgrade path.
- **"Is the money real?"** Real USDC moves on **Fuji testnet** (free faucet funds); every settlement and withdrawal is a verifiable on-chain transaction. Mainnet is a config change, not a code change.
- **"What's MVP vs production?"** MVP simplifications: MockUSDC instead of Circle USDC, `setAgentWallet` owner-gated (no EIP-712 delegation), Validation Registry omitted, a JSON-file store, and a hot-wallet treasury. All interface-compatible with the real standards so they're drop-in swappable.

### Tech stack
x402 · ERC-8004 · EIP-3009 · EIP-712 · SIWE · Avalanche Fuji (C-Chain) · USDC · Solidity / solc ·
viem · MetaMask · Node.js · Express · TypeScript · React · Vite · Tailwind CSS.

---

Built for the Avalanche "Agentic Payments" Speedrun with the
[`x402`](https://www.npmjs.com/package/x402) package and [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004).
Not affiliated with Coinbase, Circle, or Stripe.
