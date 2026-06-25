import { Link } from 'react-router-dom';
import { Container, Card, Button, Eyebrow, SectionHeading, Copyable, cx } from '../components/ui';
import { useState } from 'react';

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSent(true);
  }

  const mailtoHref =
    'mailto:hello@gatekeep.app?subject=' +
    encodeURIComponent(`New message from ${name}`) +
    '&body=' +
    encodeURIComponent(`${message}\n\n— ${name} (${email})`);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-accent-500/50';

  return (
    <section className="py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left column */}
          <div>
            <SectionHeading
              eyebrow="Contact"
              title="Get in touch"
              sub="Questions about gating an API, the 10% fee, or settling USDC on Avalanche Fuji? We read every message and usually reply within a day."
            />

            <div className="mt-8 space-y-4">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Email
                    </div>
                    <a
                      href="mailto:hello@gatekeep.app"
                      className="mt-1 block text-base font-medium text-white transition-colors hover:text-accent-300"
                    >
                      hello@gatekeep.app
                    </a>
                    <p className="mt-1 text-sm text-slate-400">
                      For sales, partnerships, and support.
                    </p>
                  </div>
                  <Copyable text="hello@gatekeep.app" label="Copy" />
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  GitHub
                </div>
                <a
                  href="https://github.com/anukulpandey/x402-payment-gate"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-base font-medium text-white transition-colors hover:text-accent-300"
                >
                  anukulpandey/x402-payment-gate
                </a>
                <p className="mt-1 text-sm text-slate-400">
                  Star the repo, open an issue, or send a pull request.
                </p>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  For developers
                </div>
                <div className="mt-1 text-base font-medium text-white">
                  Read the docs first
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  The x402 paywall flow, EIP-3009 settlement, and quickstart live
                  in our developer docs.
                </p>
                <Link
                  to="/docs"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-300 transition-colors hover:text-accent-400"
                >
                  Go to docs →
                </Link>
              </Card>
            </div>
          </div>

          {/* Right column */}
          <div>
            <Card className="p-6 sm:p-8">
              {sent ? (
                <div className="flex min-h-[20rem] flex-col items-start justify-center">
                  <Eyebrow>Message ready</Eyebrow>
                  <h3 className="mt-4 text-2xl font-semibold text-white">
                    Thanks — we'll get back to you
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    Your message is queued up. To make sure it lands in our inbox,
                    open it in your mail client using the link below.
                  </p>

                  <a
                    href={mailtoHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  >
                    Open in your mail app →
                  </a>

                  <div className="mt-8 w-full border-t border-white/8 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setName('');
                        setEmail('');
                        setMessage('');
                      }}
                      className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <Eyebrow>Send a message</Eyebrow>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    Tell us what you're building
                  </h3>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-sm font-medium text-slate-300"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-slate-300"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="mb-1.5 block text-sm font-medium text-slate-300"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder="I want to gate my pricing API behind a per-call USDC paywall…"
                        className={cx(inputClass, 'resize-y')}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="mt-6">
                    <Button type="submit" variant="primary" size="lg">
                      Send message
                    </Button>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    We'll only use your email to reply. No spam, ever.
                  </p>
                </form>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
