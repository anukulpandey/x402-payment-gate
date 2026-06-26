import { Link } from 'react-router-dom';
import { Container, Card, Badge, Eyebrow, SectionHeading, Copyable, btn, cx } from '../components/ui';

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'x402', label: 'How x402 works' },
  { id: 'agent', label: 'Paying as an agent' },
  { id: 'identity', label: 'Identity & reputation' },
  { id: 'login', label: 'Wallet login (SIWE)' },
  { id: 'api', label: 'API reference' },
  { id: 'deploy', label: 'Deploy / networks' },
];

const REPO = 'https://github.com/anukulpandey/x402-payment-gate';

export function Docs() {
  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="grid-bg border-b border-white/8">
        <Container className="py-16 sm:py-20">
          <Eyebrow>📚 Documentation</Eyebrow>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            GateKeep docs
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-400">
            Everything you need to gate a REST API behind an x402 USDC paywall — and to pay one as an
            autonomous agent. Connect a wallet, create a gate, and start earning on every call.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/app" className={btn('primary', 'md')}>
              Launch dashboard →
            </Link>
            <Link to="/how-it-works" className={btn('outline', 'md')}>
              How it works
            </Link>
            <a href={REPO} target="_blank" rel="noreferrer" className={btn('ghost', 'md')}>
              GitHub repo ↗
            </a>
          </div>
        </Container>
      </section>

      {/* ── Body: sticky TOC + content ──────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
            {/* Table of contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="text-xs uppercase tracking-wide text-slate-600">On this page</div>
                <nav className="mt-4 space-y-1 border-l border-white/8">
                  {TOC.map((t) => (
                    <a
                      key={t.id}
                      href={`#${t.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-slate-400 transition hover:border-accent-400 hover:text-white"
                    >
                      {t.label}
                    </a>
                  ))}
                </nav>
                <Card className="mt-8 p-4">
                  <div className="text-xs font-medium text-slate-400">Need the full walkthrough?</div>
                  <Link
                    to="/how-it-works"
                    className="mt-2 inline-flex text-sm text-accent-300 hover:text-accent-200"
                  >
                    Read how it works →
                  </Link>
                </Card>
              </div>
            </aside>

            {/* Content */}
            <div className="max-w-3xl space-y-20">
              <Overview />
              <Quickstart />
              <X402 />
              <Agent />
              <Identity />
              <Login />
              <Api />
              <Deploy />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

/* ── Overview ──────────────────────────────────────────────────────────── */
function Overview() {
  return (
    <article id="overview" className="scroll-mt-24">
      <SectionHeading eyebrow="Overview" title="What is GateKeep?" />
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-300">
        <p>
          GateKeep is <span className="text-white">Stripe for AI agent API calls</span>. It lets you put
          any REST endpoint behind a pay-per-call paywall using the open{' '}
          <span className="text-slate-200">x402</span> protocol. You paste a URL and a price; GateKeep
          hands you back a gated URL. When an agent calls it, GateKeep quotes the price, collects payment,
          proxies the request to your real backend, and returns the response.
        </p>
        <p>
          Payment happens in real <span className="text-emerald-300">USDC</span>, settled on-chain via{' '}
          <span className="text-slate-200">EIP-3009</span> gasless transfer authorizations. There are no
          API keys to issue, no invoices, no subscriptions, and no humans in the loop — an agent simply
          fetches the URL and pays automatically when it receives an HTTP 402.
        </p>
        <p>
          On every settled call you keep <span className="text-emerald-300">90%</span>, paid directly to
          your wallet; GateKeep takes a flat <span className="text-accent-300">10%</span> fee. Your wallet
          is both your account and your payout address, so there's nothing else to set up.
        </p>
      </div>
    </article>
  );
}

/* ── Quickstart ────────────────────────────────────────────────────────── */
function Quickstart() {
  const steps = [
    {
      t: 'Connect your wallet',
      d: 'Sign in by connecting MetaMask and signing a nonce message. It’s gasless — no transaction, no signup form. Your wallet becomes your account and payout address.',
    },
    {
      t: 'Create a gate',
      d: 'Paste any REST endpoint (your real backend URL) and set a price-per-call in USDC. GateKeep never stores credentials or touches your server beyond proxying the request.',
    },
    {
      t: 'Copy your gated URL',
      d: 'GateKeep returns an x402-wrapped URL you can share like any API endpoint:',
    },
    {
      t: 'Point an agent at it',
      d: 'Run the agent playground from the dashboard to simulate a paid call, or point a real x402 client at the gated URL — the 402 handshake and payment happen automatically.',
    },
  ];
  return (
    <article id="quickstart" className="scroll-mt-24">
      <SectionHeading eyebrow="Quickstart" title="From zero to a paid call" />
      <ol className="mt-8 space-y-5">
        {steps.map((s, i) => (
          <li key={s.t}>
            <Card className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500/15 font-mono text-[13px] text-accent-300">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.d}</p>
                  {i === 2 && (
                    <div className="mt-3">
                      <Copyable text="https://gatekeep.app/g/your-id" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <Link to="/app" className={btn('primary', 'md')}>
          Open the dashboard →
        </Link>
      </div>
    </article>
  );
}

/* ── How x402 works ────────────────────────────────────────────────────── */
function X402() {
  return (
    <article id="x402" className="scroll-mt-24">
      <SectionHeading eyebrow="Protocol" title="How x402 works" />
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-300">
        <p>
          x402 revives the dormant HTTP <span className="text-slate-200">402 Payment Required</span> status
          code into a real, machine-payable handshake. The server responds with a 402 that quotes a price
          and accepted payment scheme. The client signs a stablecoin transfer authorization and retries the
          request with an <span className="font-mono text-accent-300">X-PAYMENT</span> header. The server
          verifies, settles on-chain, and returns the real response.
        </p>
        <p>
          For the full breakdown of the flow, schemes, and settlement, read the{' '}
          <Link to="/how-it-works" className="text-accent-300 hover:text-accent-200">
            full explanation
          </Link>
          .
        </p>
      </div>
      <pre className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
        <span className="text-slate-500">{'# Agent calls the gated URL'}</span>
        {'\n'}GET /g/your-id HTTP/1.1{'\n\n'}
        <span className="text-amber-300">HTTP/1.1 402 Payment Required</span>
        {'\n'}Content-Type: application/json{'\n'}
        {'{'}
        {'\n'}
        {'  '}<span className="text-emerald-300">"x402Version"</span>: 1,{'\n'}
        {'  '}<span className="text-emerald-300">"accepts"</span>: [{'{'}
        {'\n'}
        {'    '}<span className="text-emerald-300">"scheme"</span>: "exact",{'\n'}
        {'    '}<span className="text-emerald-300">"network"</span>: "avalanche-fuji",{'\n'}
        {'    '}<span className="text-emerald-300">"maxAmountRequired"</span>: "10000",{'\n'}
        {'    '}<span className="text-emerald-300">"asset"</span>: "USDC"{'\n'}
        {'  }'}]{'\n'}
        {'}'}
      </pre>
    </article>
  );
}

/* ── Paying as an agent ────────────────────────────────────────────────── */
function Agent() {
  return (
    <article id="agent" className="scroll-mt-24">
      <SectionHeading
        eyebrow="For agents"
        title="Paying as an agent"
        sub="Any standard x402 client works unmodified. Wrap fetch with a payment signer and call the gated URL — the 402 is paid for you automatically."
      />
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-white/8 px-4 py-2.5 font-mono text-[11px] text-slate-500">
          agent.ts
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-slate-300">
          <span className="text-accent-300">import</span> {'{ wrapFetchWithPayment }'}{' '}
          <span className="text-accent-300">from</span>{' '}
          <span className="text-emerald-300">'x402-fetch'</span>;{'\n'}
          <span className="text-accent-300">import</span> {'{ createSigner }'}{' '}
          <span className="text-accent-300">from</span>{' '}
          <span className="text-emerald-300">'x402/types'</span>;{'\n\n'}
          <span className="text-slate-500">{'// the agent’s wallet, holding USDC on Fuji'}</span>
          {'\n'}
          <span className="text-accent-300">const</span> signer = <span className="text-accent-300">await</span>{' '}
          createSigner(<span className="text-emerald-300">'avalanche-fuji'</span>, KEY);{'\n'}
          <span className="text-accent-300">const</span> pay = wrapFetchWithPayment(fetch, signer);{'\n\n'}
          <span className="text-slate-500">{'// just fetch — payment is handled on the 402'}</span>
          {'\n'}
          <span className="text-accent-300">const</span> res = <span className="text-accent-300">await</span> pay(
          {'\n'}
          {'  '}
          <span className="text-emerald-300">'https://gatekeep.app/g/your-id'</span>,{'\n'});{'\n'}
          console.log(<span className="text-accent-300">await</span> res.json());
        </pre>
      </Card>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        The signer covers no gas — the EIP-3009 authorization is submitted by GateKeep's facilitator.
        On success, the response includes an{' '}
        <span className="font-mono text-accent-300">X-PAYMENT-RESPONSE</span> header with the on-chain
        settlement receipt.
      </p>
    </article>
  );
}

/* ── Identity & reputation (ERC-8004) ──────────────────────────────────── */
function Identity() {
  return (
    <article id="identity" className="scroll-mt-24">
      <SectionHeading
        eyebrow="ERC-8004"
        title="Identity & reputation"
        sub="x402 settles the payment; ERC-8004 answers who is paying and whether to trust them. Gates can require a verified agent and tier access by on-chain reputation."
      />
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-300">
        <p>
          GateKeep deploys ERC-8004{' '}
          <span className="text-white">Identity</span> and{' '}
          <span className="text-white">Reputation</span> registries on Avalanche. Agents register an
          on-chain identity (an <span className="font-mono text-accent-300">agentId</span>) and bind the
          wallet they pay from, so a gate can resolve a paying wallet to a known, verifiable agent.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { t: 'Verified agents only', d: 'A gate can require a registered identity — unregistered wallets get a 403.' },
          { t: 'Reputation tiers', d: 'Require a minimum reputation (prior on-chain attestations) to access premium gates.' },
          { t: 'Feedback loop', d: 'Each paid call writes on-chain feedback → the agent’s reputation grows, unlocking higher tiers.' },
        ].map((c) => (
          <Card key={c.t} className="p-5">
            <h3 className="text-sm font-semibold text-white">{c.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{c.d}</p>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm leading-relaxed text-slate-400">
        Enforcement happens in the gateway after the x402 payment verifies and before settlement; an
        unverified or low-reputation agent is turned away with a clear{' '}
        <span className="font-mono text-accent-300">403</span>:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
        <span className="text-amber-300">HTTP/1.1 403 Forbidden</span>
        {'\n'}
        {'{'}
        {'\n'}
        {'  '}<span className="text-emerald-300">"error"</span>: "agent_identity_required",{'\n'}
        {'  '}<span className="text-emerald-300">"message"</span>: "Register an ERC-8004 identity and bind your wallet."{'\n'}
        {'}'}
      </pre>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Set up the registries and register the demo agent with{' '}
        <span className="font-mono text-accent-300">npm run fuji:erc8004</span>. This is the x402 + ERC-8004
        combination — payments that are also identity- and reputation-aware.
      </p>
    </article>
  );
}

/* ── Wallet login (SIWE) ───────────────────────────────────────────────── */
function Login() {
  const steps = [
    {
      t: 'Connect MetaMask',
      d: 'Click connect and approve the account. GateKeep reads your address — never your keys.',
    },
    {
      t: 'Sign a nonce message',
      d: 'GateKeep issues a one-time nonce; you sign it in your wallet (gasless, Sign-In with Ethereum). This proves you control the address.',
    },
    {
      t: 'Get a session',
      d: 'The signature is verified server-side and a session is issued. Your wallet is now your account — and the payout address every settled call pays into.',
    },
  ];
  return (
    <article id="login" className="scroll-mt-24">
      <SectionHeading eyebrow="Auth" title="Wallet login (SIWE)" />
      <p className="mt-6 text-[15px] leading-relaxed text-slate-300">
        GateKeep has no passwords. Authentication is Sign-In with Ethereum: prove control of a wallet by
        signing a nonce, and that wallet becomes both your identity and your payout destination.
      </p>
      <div className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <div key={s.t} className="flex items-start gap-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500/15 font-mono text-[13px] text-accent-300">
              {i + 1}
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm leading-relaxed text-slate-400">
        Under the hood this is the{' '}
        <span className="font-mono text-accent-300">/api/auth/nonce</span> →{' '}
        <span className="font-mono text-accent-300">/api/auth/verify</span> pair below, with{' '}
        <span className="font-mono text-accent-300">/api/auth/me</span> returning the current session.
      </p>
    </article>
  );
}

/* ── API reference ─────────────────────────────────────────────────────── */
type Row = { method: string; path: string; desc: string; auth: boolean };

const ENDPOINTS: Row[] = [
  { method: 'GET', path: '/api/config', desc: 'Public runtime config (chain, USDC address, fee).', auth: false },
  { method: 'POST', path: '/api/auth/nonce', desc: 'Request a one-time nonce to sign.', auth: false },
  { method: 'POST', path: '/api/auth/verify', desc: 'Verify the signed nonce and open a session.', auth: false },
  { method: 'GET', path: '/api/auth/me', desc: 'Return the currently signed-in wallet.', auth: true },
  { method: 'GET', path: '/api/endpoints', desc: 'List your gates.', auth: true },
  { method: 'POST', path: '/api/endpoints', desc: 'Create a gate (price, target, optional ERC-8004 identity/reputation policy).', auth: true },
  { method: 'POST', path: '/api/examples', desc: 'Add the example endpoints to your account.', auth: true },
  { method: 'PATCH', path: '/api/endpoints/:id', desc: 'Update a gate (price, target, status, policy).', auth: true },
  { method: 'DELETE', path: '/api/endpoints/:id', desc: 'Delete a gate.', auth: true },
  { method: 'POST', path: '/api/endpoints/:id/simulate', desc: 'Run the agent playground against a gate.', auth: true },
  { method: 'GET', path: '/api/stats', desc: 'Aggregate earnings, call counts, withdrawable balance.', auth: true },
  { method: 'GET', path: '/api/calls', desc: 'Your settled-call ledger.', auth: true },
  { method: 'POST', path: '/api/withdraw', desc: 'Pay your earned USDC on-chain to your wallet.', auth: true },
  { method: 'ANY', path: '/g/:id', desc: 'The public gated proxy — x402 paywall in front of your API.', auth: false },
];

function methodTone(m: string): 'green' | 'violet' | 'amber' | 'red' | 'slate' {
  if (m === 'GET') return 'green';
  if (m === 'POST') return 'violet';
  if (m === 'PATCH') return 'amber';
  if (m === 'DELETE') return 'red';
  return 'slate';
}

function Api() {
  return (
    <article id="api" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Reference"
        title="API reference"
        sub="Endpoints marked “wallet” require a signed-in session (see Wallet login above). Public routes need no auth."
      />
      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left">
                <th className="px-4 py-3 font-medium text-slate-400">Method</th>
                <th className="px-4 py-3 font-medium text-slate-400">Path</th>
                <th className="px-4 py-3 font-medium text-slate-400">Description</th>
                <th className="px-4 py-3 font-medium text-slate-400">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {ENDPOINTS.map((r) => (
                <tr key={`${r.method} ${r.path}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={methodTone(r.method)}>{r.method}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[12.5px] text-slate-200">
                    {r.path}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.desc}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.auth ? (
                      <span className="text-xs text-accent-300">wallet</span>
                    ) : (
                      <span className="text-xs text-slate-500">public</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </article>
  );
}

/* ── Deploy / networks ─────────────────────────────────────────────────── */
function Deploy() {
  return (
    <article id="deploy" className="scroll-mt-24">
      <SectionHeading eyebrow="Operate" title="Deploy / networks" />
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-300">
        <p>
          GateKeep settles real USDC on{' '}
          <span className="text-white">Avalanche Fuji</span> (chain id{' '}
          <span className="font-mono text-accent-300">43113</span>) today. Because settlement uses the
          standard EIP-3009 transfer-with-authorization flow, it works on{' '}
          <span className="text-slate-200">any EVM chain</span> that has an EIP-3009-capable USDC — only
          the runtime config (RPC, chain id, USDC address) changes.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { k: 'Network', v: 'Avalanche Fuji' },
          { k: 'Chain id', v: '43113' },
          { k: 'Asset', v: 'USDC · EIP-3009' },
        ].map((c) => (
          <Card key={c.k} className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{c.k}</div>
            <div className="mt-1 font-mono text-sm text-slate-200">{c.v}</div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm leading-relaxed text-slate-400">
        For self-hosting, environment variables, and switching networks, see the full deploy guide in the{' '}
        <a href={REPO} target="_blank" rel="noreferrer" className="text-accent-300 hover:text-accent-200">
          GitHub repo ↗
        </a>
        .
      </p>
      <div className={cx('mt-8 flex flex-wrap items-center gap-3')}>
        <Link to="/app" className={btn('primary', 'md')}>
          Launch dashboard →
        </Link>
        <a href={REPO} target="_blank" rel="noreferrer" className={btn('outline', 'md')}>
          Full deploy guide ↗
        </a>
      </div>
    </article>
  );
}
