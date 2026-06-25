# Deploying GateKeep to Avalanche

GateKeep's `chain` settlement mode is **RPC-agnostic** — the same code settles
against Avalanche Fuji, Avalanche mainnet, or any EVM chain with an EIP-3009 USDC.
Going live is a **config change, not a code change**: point it at an RPC and a
USDC token.

This guide covers **Avalanche Fuji (testnet)** first — the recommended way to
demo on a real public chain — then the changes for **Avalanche mainnet**.

> The same steps work for Base, Polygon, or any EVM chain with an EIP-3009 USDC —
> just swap the RPC, chain id, and token address.

---

## Quickest path — Fuji in 3 commands

GateKeep ships a turnkey Fuji flow. The only manual step is funding one wallet
with test AVAX (faucets need a captcha, so a script can't do it for you).

```bash
npm run fuji:setup     # generates wallets → .env.fuji (gitignored), prints the
                       # facilitator address + the faucet link
# → fund the printed facilitator address at https://faucet.avax.network
npm run fuji:deploy    # deploys MockUSDC to Fuji, mints USDC to the agent,
                       # and writes USDC_ADDRESS back into .env.fuji
npm run fuji:start     # runs GateKeep against Fuji on http://localhost:4021
```

Then open the dashboard, click **Run agent**, and confirm the settlement tx on
[Snowtrace testnet](https://testnet.snowtrace.io). `npm run fuji:agent` pays a gate
from the terminal. The sections below explain what each step does and the
production (mainnet / real-USDC) variations.

---

## How chain mode works (recap)

Three wallets, set via env:

| Role | Env | Needs | On Avalanche |
| --- | --- | --- | --- |
| **Facilitator** | `FACILITATOR_PRIVATE_KEY` | native gas (AVAX) | submits settlement txs, pays gas |
| **Agent** | `AGENT_PRIVATE_KEY` | USDC | the demo payer (your real agents bring their own wallets) |
| **Platform** | `PLATFORM_WALLET` | nothing | receives USDC (your revenue address) |

The facilitator is the only wallet that spends gas. Each settlement is one
`transferWithAuthorization` call (~tens of thousands of gas — fractions of a cent
of AVAX).

---

## Reference values

| | Fuji (testnet) | Mainnet (C-Chain) |
| --- | --- | --- |
| `CHAIN_ID` | `43113` | `43114` |
| `RPC_URL` | `https://api.avax-test.network/ext/bc/C/rpc` | `https://api.avax.network/ext/bc/C/rpc` |
| Explorer | https://testnet.snowtrace.io | https://snowtrace.io |
| AVAX faucet | https://faucet.avax.network | — (buy AVAX) |
| Native USDC | *(deploy MockUSDC, or use Circle's test USDC)* | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` ⚠️ verify |

> ⚠️ **Always verify the USDC address** against Circle's official list
> (<https://developers.circle.com/stablecoins/usdc-contract-addresses>) before
> sending real money. Token addresses in third-party docs go stale.

---

## Path A — Fuji testnet with MockUSDC (recommended demo)

The simplest way to run on a real public chain: deploy GateKeep's own
faucet-mintable `MockUSDC` to Fuji and mint test USDC to your agent. No waiting on
a USDC faucet, full control. This is exactly what `npm run fuji:setup` automates —
here's what it does, step by step.

### 1. Create wallets

`npm run fuji:setup` generates a facilitator + agent + platform wallet and writes
them to `.env.fuji` (gitignored). To bring your own instead, generate keypairs
(`cast wallet new`) and fill them into `.env.fuji` by hand.

### 2. Fund the facilitator with test AVAX

`fuji:setup` prints the **facilitator** address — send it some Fuji AVAX from
<https://faucet.avax.network>. It needs gas to deploy the token and settle
payments. (The agent needs **no** AVAX — its payments are gasless.)

### 3. Configure `.env.fuji`

`fuji:setup` writes this for you; it looks like:

```bash
X402_MODE=chain
X402_NETWORK=avalanche-fuji
CHAIN_ID=43113
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

USDC_ADDRESS=                  # filled in automatically by fuji:deploy
USDC_NAME=USD Coin
USDC_VERSION=2
USDC_DECIMALS=6

FACILITATOR_PRIVATE_KEY=0x<funded facilitator key>
AGENT_PRIVATE_KEY=0x<agent key>
PLATFORM_WALLET=0x<your revenue address>
PLATFORM_FEE_BPS=1000
```

### 4. Deploy MockUSDC + mint to the agent

```bash
npm run fuji:deploy
```

It deploys the token, mints 1,000 test USDC to the agent, and **writes
`USDC_ADDRESS` back into `.env.fuji`** automatically:

```
  MockUSDC deployed at 0x1234…abcd
  agent 0x…  →  1000 USDC
  wrote USDC_ADDRESS=0x1234…abcd → .env.fuji
```

### 5. Run GateKeep

```bash
npm run build          # build the dashboard once
npm run fuji:start     # serve API + dashboard against Fuji on :4021
```

Open <http://localhost:4021>, click **Run agent**, and watch a payment settle —
the tx is now on Fuji. Verify it on [Snowtrace testnet](https://testnet.snowtrace.io).

---

## Path B — Fuji or mainnet with **real Circle USDC**

For a production-grade setup, settle in real Circle USDC instead of MockUSDC.

### 1. Get USDC into the agent wallet

- **Testnet:** request test USDC from Circle's faucet
  (<https://faucet.circle.com>), choosing Avalanche Fuji.
- **Mainnet:** bridge or buy USDC on Avalanche C-Chain into the agent wallet.

Your real customers' agents bring their own funded wallets — you only fund an
agent for *your own* demo/testing.

### 2. Configure with the real token

```bash
X402_MODE=chain
X402_NETWORK=avalanche            # or avalanche-fuji
CHAIN_ID=43114                    # 43113 for Fuji
RPC_URL=https://api.avax.network/ext/bc/C/rpc
USDC_ADDRESS=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E   # ⚠️ verify on Circle's list
USDC_NAME=USD Coin
USDC_VERSION=2
USDC_DECIMALS=6
FACILITATOR_PRIVATE_KEY=0x<facilitator, funded with AVAX for gas>
PLATFORM_WALLET=0x<your USDC revenue address>
```

> **No deploy step** — you're using an existing token, so skip `fuji:deploy`. Just
> confirm `USDC_NAME` / `USDC_VERSION` match the token's EIP-712 domain (Circle
> USDC is `"USD Coin"` / `"2"`); a mismatch makes every signature fail
> verification.

### 3. Run

```bash
npm run build && DOTENV_CONFIG_PATH=.env.fuji npm start
```

---

## Running it as a real service

- **Reverse proxy + TLS.** Put GateKeep behind nginx/Caddy with HTTPS and set
  `PUBLIC_BASE_URL=https://your-domain` so the `resource` field in 402s (and your
  gated URLs) are correct and reachable by agents.
- **Process manager.** Run under systemd / pm2 / a container — `npm start` serves
  the API + built dashboard on one port.
- **Persistence.** The default store is a JSON file in `DATA_DIR` (atomic writes,
  flush-on-exit). For real scale, swap [`store.ts`](../src/store.ts) for Postgres —
  the interface is small and self-contained.

## Operating the facilitator

- **Keep it funded.** Monitor the facilitator's AVAX balance; if it runs dry,
  settlements fail and gated resources are withheld (agents get a 402, not a free
  response — safe, but you stop earning). Alert on low balance.
- **Treat the key as a hot wallet.** It signs settlement txs continuously. Use a
  dedicated key, load it from a secret manager (not committed env), and cap its
  exposure — it only ever calls `transferWithAuthorization`.
- **Gas is tiny but real.** Each settlement is one transfer. Budget AVAX
  accordingly and consider batching or a paymaster at high volume.

## Going to mainnet — checklist

- [ ] `USDC_ADDRESS` verified against Circle's official list
- [ ] `CHAIN_ID=43114` and a reliable mainnet `RPC_URL` (consider a paid RPC for uptime)
- [ ] Facilitator key in a secret manager, funded with AVAX, balance-alerted
- [ ] `PLATFORM_WALLET` is an address you control (ideally a multisig)
- [ ] `PUBLIC_BASE_URL` is your public HTTPS origin
- [ ] Seller-payout process in place (the ledger tracks what's owed; payouts are out-of-band)
- [ ] Load-tested; store swapped to a real DB if needed

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every payment → `invalid_exact_evm_payload_signature` | `USDC_NAME`/`USDC_VERSION`/`CHAIN_ID` don't match the token's EIP-712 domain | Match them to the real token (Circle USDC: `"USD Coin"`/`"2"`) |
| `insufficient_funds` | Agent wallet has no USDC | Mint (MockUSDC) or fund (real USDC) the agent |
| Settlement reverts / `chain not reachable` | Facilitator has no AVAX, or RPC is down/rate-limited | Fund the facilitator; use a reliable RPC |
| `duplicate_settlement` | The same signed `X-PAYMENT` was replayed | Expected — each authorization is single-use; sign a fresh one |
