import { Link } from 'react-router-dom';
import {
  Container,
  Card,
  Badge,
  Eyebrow,
  SectionHeading,
  Copyable,
  Json,
  btn,
  cx,
} from '../components/ui';

const flowSteps = [
  {
    n: 1,
    title: 'Agent calls the gated URL',
    body: 'An autonomous agent makes an ordinary HTTP request to your endpoint — no API key, no account, no payment attached. Just a plain GET or POST.',
  },
  {
    n: 2,
    title: 'GateKeep answers 402',
    body: 'Instead of serving data, the gateway returns HTTP 402 Payment Required with a machine-readable quote: the price, the asset (USDC), the network, and where to pay.',
  },
  {
    n: 3,
    title: 'Agent signs an authorization',
    body: 'The agent reads the quote and signs an EIP-3009 transferWithAuthorization message off-chain. It is gasless — a signature, not a transaction. No wallet pop-up, no human.',
  },
  {
    n: 4,
    title: 'Agent retries with X-PAYMENT',
    body: 'The same request is replayed, now carrying the signed payload in an X-PAYMENT header. The agent never had to leave the request/response loop.',
  },
  {
    n: 5,
    title: 'GateKeep verifies and settles',
    body: 'The gateway checks the signature, the nonce, and the on-chain USDC balance, then proxies the call to your origin API and submits the authorization for settlement on Avalanche Fuji.',
  },
  {
    n: 6,
    title: '200 OK plus a receipt',
    body: 'Your API response is returned to the agent with a 200 status and an X-PAYMENT-RESPONSE settlement receipt header — proof the USDC moved, including the transaction hash.',
  },
];

const response402 = {
  x402Version: 1,
  error: 'Payment Required',
  accepts: [
    {
      scheme: 'exact',
      network: 'avalanche-fuji',
      maxAmountRequired: '10000',
      resource: 'https://api.yourco.com/v1/forecast',
      description: 'Per-call access to the forecast endpoint',
      payTo: '0x9A7f...c41E',
      asset: '0x5425890298aed601595a70AB815c96711a31Bc65',
      maxTimeoutSeconds: 60,
    },
  ],
};

export function HowItWorks() {
  return (
    <div>
      {/* 1. Hero */}
      <section className="py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Payments for the agent economy, over plain HTTP
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
              GateKeep turns any REST endpoint into a pay-per-call resource that
              autonomous agents can buy from on their own — no keys, no checkout,
              no humans. It runs on the open x402 standard and settles real USDC
              on Avalanche Fuji.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app" className={btn('primary', 'lg')}>
                Launch dashboard
              </Link>
              <Link to="/docs" className={btn('outline', 'lg')}>
                Read the docs
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. The problem */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="The problem"
            title="The web was built for humans with credit cards"
            sub="Every paid API assumes a person on the other end — someone to sign up, copy an API key into a config file, and type card details into a billing form."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card className="p-6">
              <Badge tone="red">Can't sign up</Badge>
              <h3 className="mt-4 text-lg font-medium text-white">
                No accounts to create
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                An agent spun up to solve one task has no inbox to verify, no
                dashboard to click through, and no patience for an onboarding
                funnel built for people.
              </p>
            </Card>
            <Card className="p-6">
              <Badge tone="red">Can't hold keys</Badge>
              <h3 className="mt-4 text-lg font-medium text-white">
                No secrets to manage
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Long-lived API keys are a liability for ephemeral agents — there
                is nowhere safe to store them, and rotating them across a swarm
                is its own headache.
              </p>
            </Card>
            <Card className="p-6">
              <Badge tone="red">Can't pay by card</Badge>
              <h3 className="mt-4 text-lg font-medium text-white">
                No card to enter
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Cards need a name, a billing address, and a human to consent.
                Agents have none of that — but they can hold and move a
                stablecoin balance natively.
              </p>
            </Card>
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-slate-300">
            Agents{' '}
            <span className="text-accent-300">can pay per request</span> — they
            just need the web to ask them in a language they understand. That
            missing handshake is exactly what x402 provides.
          </p>
        </Container>
      </section>

      {/* 3. What is x402 */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="The standard"
            title="What is x402?"
            sub="x402 revives the long-dormant HTTP 402 status code and turns it into a real, machine-payable handshake between any client and any server."
          />
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="space-y-5 text-sm leading-relaxed text-slate-400">
              <p>
                When a request arrives without payment, the server responds with{' '}
                <span className="font-mono text-accent-300">402 Payment Required</span>{' '}
                and an <span className="text-white">accepts</span> array. Each
                entry is a price quote: which scheme to use, which network to
                pay on, how much is owed, and the address to pay.
              </p>
              <p>
                The client picks a quote it can satisfy, signs a stablecoin
                (USDC) transfer for that amount, and{' '}
                <span className="text-white">retries the exact same request</span>{' '}
                with the signed payment attached. No redirect, no separate
                checkout page, no out-of-band flow.
              </p>
              <p>
                Because the whole exchange lives inside normal HTTP headers, any
                language with an HTTP client can speak it — and any agent that
                already makes API calls can pay for them.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge tone="violet">HTTP-native</Badge>
                <Badge tone="green">USDC settled</Badge>
                <Badge tone="slate">Open standard</Badge>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  402 response body
                </span>
                <Copyable
                  text={JSON.stringify(response402, null, 2)}
                  label="Copy JSON"
                />
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
{`HTTP/1.1 402 Payment Required
Content-Type: application/json`}
              </pre>
              <div className="mt-3">
                <Json value={response402} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                <span className="text-slate-400">maxAmountRequired</span> is
                denominated in the asset's smallest unit — for USDC's 6
                decimals,{' '}
                <span className="font-mono text-accent-300">10000</span> means
                $0.01.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. The payment flow */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="End to end"
            title="The payment flow"
            sub="From the first unpaid request to a signed settlement receipt — six steps, all inside a single request/response cycle."
          />
          <ol className="mt-12 grid gap-5 md:grid-cols-2">
            {flowSteps.map((step) => (
              <li key={step.n}>
                <Card className="flex h-full gap-4 p-6">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-accent-500/10 font-mono text-sm font-semibold text-accent-300">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {step.body}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 5. Gasless via EIP-3009 */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="No gas required"
            title="Gasless via EIP-3009"
            sub="The agent signs an authorization; GateKeep's facilitator submits it on-chain and pays the gas. The agent needs USDC and nothing else."
          />
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="space-y-5 text-sm leading-relaxed text-slate-400">
              <p>
                USDC implements{' '}
                <span className="font-mono text-accent-300">EIP-3009</span>, the
                transfer-with-authorization standard. Instead of sending a
                transaction itself, the agent signs a typed message that says
                &ldquo;move this amount from me to that address, valid for this
                window, using this one-time nonce.&rdquo;
              </p>
              <p>
                GateKeep's facilitator takes that signature and calls{' '}
                <span className="font-mono text-white">
                  transferWithAuthorization
                </span>{' '}
                on the USDC contract,{' '}
                <span className="text-white">paying the gas in AVAX</span> on the
                agent's behalf. The signature alone authorizes the move — no
                AVAX ever has to touch the agent's wallet.
              </p>
              <p>
                The nonce makes each authorization single-use, and the validity
                window bounds it in time, so a captured signature can't be
                replayed or front-run.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge tone="green">Agent holds only USDC</Badge>
                <Badge tone="slate">One-time nonce</Badge>
                <Badge tone="violet">Facilitator pays gas</Badge>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
{`// Off-chain message the agent signs — no gas, no transaction
const authorization = {
  from:        "0xAgent...b21",
  to:          "0x9A7f...c41E",   // payTo from the 402
  value:       "10000",            // 0.01 USDC (6 decimals)
  validAfter:  0,
  validBefore: 1750000000,         // expiry, seconds
  nonce:       "0x7d3f...a09c"     // single-use
};

// signTypedData(EIP-712) -> v, r, s
// GateKeep's facilitator then calls on-chain:
//   USDC.transferWithAuthorization(
//     from, to, value,
//     validAfter, validBefore, nonce,
//     v, r, s
//   )   <-- facilitator pays the AVAX gas`}
            </pre>
          </div>
        </Container>
      </section>

      {/* 6. You only pay when you earn */}
      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="You only pay when you earn"
            sub="There is no subscription and no minimum. GateKeep takes a flat 10% of each successful call — and zero on the ones that never happen."
          />
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5 text-sm leading-relaxed text-slate-400">
              <p>
                Every paid request is settled atomically: the agent's USDC
                splits between you and GateKeep in the same on-chain settlement.
                You never invoice, never chase payment, and never carry the risk
                of an unpaid call — if the payment doesn't verify, your API
                is never even proxied.
              </p>
              <p>
                Take a request priced at{' '}
                <span className="text-emerald-300">$0.01</span>. You keep{' '}
                <span className="text-emerald-300">$0.009</span> — a clean{' '}
                <span className="text-white">90%</span> — and GateKeep's fee
                is the remaining{' '}
                <span className="text-accent-300">$0.001</span>. Scale that
                across a swarm of agents calling thousands of times a minute and
                the economics stay exactly the same.
              </p>
            </div>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Agent pays per call
                </span>
                <span className="font-mono text-lg font-semibold text-white">
                  $0.01000
                </span>
              </div>
              <div className="my-5 h-px bg-white/8" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 font-medium text-slate-400">Recipient</th>
                    <th className="pb-3 text-right font-medium text-slate-400">
                      Share
                    </th>
                    <th className="pb-3 text-right font-medium text-slate-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  <tr>
                    <td className="py-3 text-white">You (the seller)</td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      90%
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-300">
                      $0.00900
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white">GateKeep fee</td>
                    <td className="py-3 text-right font-mono text-slate-300">
                      10%
                    </td>
                    <td className="py-3 text-right font-mono text-accent-300">
                      $0.00100
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs leading-relaxed text-emerald-200">
                  No fixed costs. No fee on failed or unpaid requests. You earn
                  before GateKeep does.
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* 7. CTA band */}
      <section className="py-20">
        <Container>
          <Card
            className={cx(
              'relative overflow-hidden p-10 text-center sm:p-14',
              'border-accent-400/20 bg-accent-500/10',
            )}
          >
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Gate your first endpoint in minutes
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Point GateKeep at any REST API, set a price, and start earning
                USDC the moment an agent makes a call. No card on file, no
                contract, no surprises.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/app" className={btn('primary', 'lg')}>
                  Launch dashboard
                </Link>
                <Link to="/docs" className={btn('ghost', 'lg')}>
                  Browse the docs
                </Link>
              </div>
            </div>
          </Card>
        </Container>
      </section>
    </div>
  );
}
