import { Link } from 'react-router-dom';
import { Container, Card, Eyebrow, SectionHeading, btn, cx } from '../components/ui';

export function Landing() {
  return (
    <div>
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Features />
      <FlowDemo />
      <Pricing />
      <Faq />
      <CtaBand />
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="grid-bg relative overflow-hidden border-b border-white/8">
      <Container className="relative py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="fade-up">
            <Eyebrow>⚡ Stripe for AI agent API calls</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Get paid every time an <span className="gradient-text">AI agent</span> calls your API.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
              Wrap any REST endpoint in a pay-per-call gate. Agents pay in USDC over the open{' '}
              <span className="text-slate-200">x402</span> protocol — automatically, on-chain, with no
              Stripe, no API keys, and no humans in the loop.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app" className={btn('primary', 'lg')}>
                Launch dashboard →
              </Link>
              <Link to="/how-it-works" className={btn('outline', 'lg')}>
                See how it works
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live on Avalanche Fuji
              </span>
              <span>·</span>
              <span>Connect a wallet — no signup</span>
            </div>
          </div>
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <ExchangeCard />
          </div>
        </div>
      </Container>
    </section>
  );
}

function ExchangeCard() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-[11px] text-slate-500">agent → your gated API</span>
      </div>
      <div className="space-y-3 p-4 font-mono text-[12.5px] leading-relaxed">
        <div>
          <span className="text-slate-500">$ GET</span> <span className="text-slate-300">/g/btc-oracle</span>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-amber-300">
          402 Payment Required <span className="text-amber-300/60">· price $0.01 USDC</span>
        </div>
        <div>
          <span className="text-slate-500">$ GET</span> <span className="text-slate-300">/g/btc-oracle</span>{' '}
          <span className="text-accent-300">+ X-PAYMENT</span>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-emerald-200">
          200 OK <span className="text-emerald-300/70">{'{ "bitcoin": { "usd": 61124 } }'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/8 pt-3 text-[11px] text-slate-500">
          <span>settled on-chain · 0.01 USDC</span>
          <span className="text-emerald-300">you earn +$0.009</span>
        </div>
      </div>
    </Card>
  );
}

/* ── Trust strip ────────────────────────────────────────────────────────── */
function TrustStrip() {
  const items = ['x402 protocol', 'USDC', 'EIP-3009', 'Avalanche', 'viem', 'MetaMask', 'EIP-712', 'Snowtrace'];
  return (
    <div className="border-b border-white/8 py-6">
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="text-xs uppercase tracking-wide text-slate-600">Built on</span>
          {items.map((i) => (
            <span key={i} className="font-medium text-slate-400">
              {i}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}

/* ── How it works ──────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      t: 'Paste & price',
      d: 'Drop in any REST endpoint and set a price-per-call. We never touch your backend.',
    },
    {
      n: '02',
      t: 'Get a gated URL',
      d: 'GateKeep returns an x402-wrapped URL. Share it the way you’d share any API endpoint.',
    },
    {
      n: '03',
      t: 'Agents auto-pay',
      d: 'A 402 quotes the price; the agent signs a USDC payment and the call unlocks — instantly.',
    },
    {
      n: '04',
      t: 'You earn',
      d: 'Every settled call splits revenue to your wallet. GateKeep keeps a small, flat cut.',
    },
  ];
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From REST endpoint to revenue in four steps"
          sub="No invoices, no subscriptions, no chargebacks. Just per-request payments that settle in seconds."
          center
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n} className="p-6">
              <div className="font-mono text-sm text-accent-400">{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold text-white">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.d}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Features ──────────────────────────────────────────────────────────── */
function Features() {
  const features = [
    { icon: '⚡', t: 'One-click gating', d: 'Wrap any endpoint behind a paywall in seconds — no SDK to install, no code to change.' },
    { icon: '🤖', t: 'Autonomous payments', d: 'Agents pay programmatically with any standard x402 client. No accounts, no API keys.' },
    { icon: '⛓️', t: 'On-chain settlement', d: 'Real USDC transfers via EIP-3009. Gasless for the agent; the facilitator covers gas.' },
    { icon: '💸', t: 'Revenue split', d: 'You keep the lion’s share of every call. GateKeep takes a small, transparent cut.' },
    { icon: '🔐', t: 'Wallet login', d: 'Sign in with MetaMask — your wallet is your account and your payout address.' },
    { icon: '🧩', t: 'Protocol-native', d: 'Speaks the real x402 spec, so x402-fetch, AgentKit, and others work unmodified.' },
  ];
  return (
    <section className="border-y border-white/8 bg-white/[0.015] py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Why GateKeep"
          title="Everything you need to monetize an API for agents"
          center
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.t} className="p-6 transition hover:border-accent-500/30">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500/10 text-xl">{f.icon}</div>
              <h3 className="mt-4 text-base font-semibold text-white">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.d}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Flow / code demo ──────────────────────────────────────────────────── */
function FlowDemo() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="For agent developers"
              title="Any x402 client just works"
              sub="No special integration. Point a payment-aware fetch at a gated URL and the 402 handshake happens automatically."
            />
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                'Agent requests the URL → gets a 402 with the price',
                'Agent signs a gasless USDC authorization (EIP-3009)',
                'GateKeep verifies, proxies your API, and settles on-chain',
                'Response is delivered with a settlement receipt header',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500/15 text-[11px] text-accent-300">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden">
            <div className="border-b border-white/8 px-4 py-2.5 font-mono text-[11px] text-slate-500">
              agent.ts
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-slate-300">
              <span className="text-accent-300">import</span> {'{ wrapFetchWithPayment }'}{' '}
              <span className="text-accent-300">from</span> <span className="text-emerald-300">'x402-fetch'</span>;{'\n'}
              <span className="text-accent-300">import</span> {'{ createSigner }'}{' '}
              <span className="text-accent-300">from</span> <span className="text-emerald-300">'x402/types'</span>;{'\n\n'}
              <span className="text-slate-500">{'// your agent’s wallet, holding USDC'}</span>
              {'\n'}
              <span className="text-accent-300">const</span> signer = <span className="text-accent-300">await</span>{' '}
              createSigner(<span className="text-emerald-300">'avalanche-fuji'</span>, KEY);{'\n'}
              <span className="text-accent-300">const</span> pay = wrapFetchWithPayment(fetch, signer);{'\n\n'}
              <span className="text-slate-500">{'// just fetch — payment happens on 402'}</span>
              {'\n'}
              <span className="text-accent-300">const</span> res = <span className="text-accent-300">await</span> pay(
              {'\n'}  <span className="text-emerald-300">'https://gatekeep.app/g/btc-oracle'</span>,{'\n'});{'\n'}
              console.log(<span className="text-accent-300">await</span> res.json());
            </pre>
          </Card>
        </div>
      </Container>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────────────────────── */
function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-white/8 bg-white/[0.015] py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Free to start. We earn only when you do."
          sub="No monthly fees, no minimums. GateKeep takes a flat cut of each settled call — you keep the rest, paid to your wallet."
          center
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          <Card className="p-7">
            <div className="text-sm font-medium text-slate-400">You keep</div>
            <div className="mt-1 text-4xl font-semibold text-emerald-300">90%</div>
            <div className="mt-1 text-sm text-slate-500">of every call, settled to your wallet</div>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
              {['Unlimited gated endpoints', 'Per-call USDC settlement', 'Live dashboard & call ledger', 'Wallet-based login'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {t}
                  </li>
                ),
              )}
            </ul>
          </Card>
          <Card className="p-7 ring-1 ring-accent-500/30">
            <div className="text-sm font-medium text-slate-400">GateKeep fee</div>
            <div className="mt-1 text-4xl font-semibold text-accent-300">10%</div>
            <div className="mt-1 text-sm text-slate-500">flat, per settled call — nothing else</div>
            <div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4 font-mono text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Agent pays</span>
                <span className="text-white">$0.010</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>You earn</span>
                <span className="text-emerald-300">$0.009</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>GateKeep</span>
                <span className="text-accent-300">$0.001</span>
              </div>
            </div>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <Link to="/app" className={btn('primary', 'lg')}>
            Start earning →
          </Link>
        </div>
      </Container>
    </section>
  );
}

/* ── FAQ ───────────────────────────────────────────────────────────────── */
function Faq() {
  const qs = [
    {
      q: 'What is x402?',
      a: 'x402 is an open protocol that turns the HTTP “402 Payment Required” status code into a real, machine-payable handshake. A server quotes a price; the client pays by signing a stablecoin transfer and retries. It’s how agents pay per request without accounts or cards.',
    },
    {
      q: 'Do I need to know crypto?',
      a: 'Not really. You connect a wallet (MetaMask) to sign in and receive earnings. Your customers’ agents handle payment automatically. We deal with the on-chain settlement under the hood.',
    },
    {
      q: 'What does it cost?',
      a: 'Nothing to start. GateKeep takes a flat 10% of each settled call; you keep 90%, paid in USDC to your wallet. No monthly fees.',
    },
    {
      q: 'Which chains and tokens?',
      a: 'GateKeep settles real USDC via EIP-3009. It runs on Avalanche Fuji today and works on any EVM chain with an EIP-3009 USDC — only the config changes.',
    },
    {
      q: 'How do agents actually pay?',
      a: 'They sign a gasless USDC authorization (the agent never needs gas). GateKeep’s facilitator submits it on-chain and pays the gas, then unlocks your API response.',
    },
  ];
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHeading eyebrow="FAQ" title="Questions, answered" center />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-white/8">
          {qs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-medium text-white">
                {item.q}
                <span className="text-slate-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── CTA band ──────────────────────────────────────────────────────────── */
function CtaBand() {
  return (
    <section className="py-12">
      <Container>
        <div
          className={cx(
            'grid-bg overflow-hidden rounded-3xl border border-accent-500/20 px-8 py-14 text-center',
            'bg-gradient-to-b from-accent-500/[0.08] to-transparent',
          )}
        >
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start gating your API in two minutes
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Connect your wallet, paste an endpoint, set a price. The agent economy will do the rest.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app" className={btn('primary', 'lg')}>
              Launch dashboard →
            </Link>
            <Link to="/docs" className={btn('outline', 'lg')}>
              Read the docs
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
