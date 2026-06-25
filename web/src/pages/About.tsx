import { Link } from 'react-router-dom';
import { Container, Card, Badge, Eyebrow, SectionHeading, btn } from '../components/ui';

const principles = [
  {
    tone: 'violet' as const,
    label: 'Open protocol',
    title: 'Open protocol, not a walled garden',
    body: 'GateKeep is built on x402 — an open HTTP-native payment standard. No proprietary lock-in, no bespoke SDK. Any client that speaks the protocol can pay, and any server can be gated.',
  },
  {
    tone: 'green' as const,
    label: 'Developer-first',
    title: 'Developer-first by default',
    body: 'Paste a URL, set a price, get a gated endpoint. No payment forms, no invoicing, no merchant onboarding. The fastest path from "I have an API" to "agents pay me for it."',
  },
  {
    tone: 'amber' as const,
    label: 'Non-custodial',
    title: 'Non-custodial identity',
    body: 'Your wallet is your account and your payout address at the same time. We never hold your keys or your funds — settlement flows directly on-chain, and you stay in control.',
  },
  {
    tone: 'slate' as const,
    label: 'Real settlement',
    title: 'Real, verifiable settlement',
    body: 'Every call settles real USDC on Avalanche Fuji via EIP-3009. No IOUs, no off-chain ledger you have to trust — each payment is a transaction you can verify yourself.',
  },
];

const stack = [
  { name: 'x402', tone: 'violet' as const, note: 'HTTP-native payments' },
  { name: 'USDC', tone: 'green' as const, note: 'Stablecoin settlement' },
  { name: 'EIP-3009', tone: 'slate' as const, note: 'Transfer with authorization' },
  { name: 'EIP-712', tone: 'slate' as const, note: 'Typed-data signing' },
  { name: 'Avalanche Fuji', tone: 'red' as const, note: 'Fast, cheap finality' },
  { name: 'viem', tone: 'amber' as const, note: 'Typed Ethereum client' },
  { name: 'MetaMask', tone: 'amber' as const, note: 'Wallet & signatures' },
  { name: 'React', tone: 'violet' as const, note: 'The interface' },
];

const numbers = [
  { value: '90%', label: 'Goes to the seller on every call' },
  { value: '10%', label: 'GateKeep fee, taken at settlement' },
  { value: '402', label: 'The HTTP status that finally works' },
  { value: '1', label: 'Click to monetize an endpoint' },
];

export function About() {
  return (
    <div>
      <section className="py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>About</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              The payment layer for the agent economy
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              We are heading into a near future where software agents — not people clicking
              buttons — are the main consumers of APIs. They read, reason, and act in loops,
              and they need to pay for what they use autonomously, per call, without a human in
              the middle. GateKeep is the rail that lets them.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app" className={btn('primary', 'lg')}>
                Open the app
              </Link>
              <a
                href="https://github.com/anukulpandey/x402-payment-gate"
                target="_blank"
                rel="noreferrer"
                className={btn('outline', 'lg')}
              >
                View on GitHub
              </a>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Origin"
            title="Why we built GateKeep"
          />
          <div className="mx-auto mt-10 grid max-w-4xl gap-6">
            <Card className="p-7">
              <p className="text-base leading-relaxed text-slate-300">
                The web reserved HTTP status code{' '}
                <span className="font-mono text-accent-300">402 Payment Required</span> more
                than 25 years ago — and then never shipped it. For a quarter century it sat in
                the spec as a placeholder for a payments primitive the internet was supposed to
                grow into but never did. Every paywall since has been a bolt-on: redirects,
                checkout pages, API keys, and billing dashboards stitched around HTTP rather
                than built into it.
              </p>
            </Card>
            <Card className="p-7">
              <p className="text-base leading-relaxed text-slate-300">
                x402 finally turns 402 on. A server can answer a request with a price, a client
                can pay it inline, and the request completes — all inside the same HTTP
                exchange, no humans required. That is exactly the shape agents need.
              </p>
            </Card>
            <Card className="p-7">
              <p className="text-base leading-relaxed text-slate-300">
                GateKeep makes it{' '}
                <span className="text-emerald-400">one click to monetize an API</span> for
                agents and take a cut — the way Stripe did for cards. You bring an endpoint, we
                put a USDC paywall in front of it, agents pay per call, you keep 90%, and we
                settle the rest on-chain. The plumbing that took the rest of the web a startup
                to build now takes a URL.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Principles"
            title="What we optimize for"
            sub="A few opinions that shape every decision in the product."
            center
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {principles.map((p) => (
              <Card key={p.label} className="p-7">
                <Badge tone={p.tone}>{p.label}</Badge>
                <h3 className="mt-4 text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="The stack"
            title="What it runs on"
            sub="Open standards and battle-tested tooling, end to end."
            center
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stack.map((s) => (
              <Card key={s.name} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-white">{s.name}</span>
                  <Badge tone={s.tone}>core</Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{s.note}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="By the numbers"
            title="The deal, in four figures"
            center
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {numbers.map((n) => (
              <Card key={n.label} className="p-7 text-center">
                <div className="text-4xl font-semibold tracking-tight text-accent-300">
                  {n.value}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{n.label}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-12 p-9 text-center">
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
              If the next decade of the internet is written by agents, the API economy needs a
              payment layer they can use without asking permission. We are building it — open,
              non-custodial, and settled in real money.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app" className={btn('primary', 'lg')}>
                Gate your first endpoint
              </Link>
              <a
                href="https://github.com/anukulpandey/x402-payment-gate"
                target="_blank"
                rel="noreferrer"
                className={btn('ghost', 'lg')}
              >
                Read the source
              </a>
            </div>
          </Card>
        </Container>
      </section>
    </div>
  );
}
