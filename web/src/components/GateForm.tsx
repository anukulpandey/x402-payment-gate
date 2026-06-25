import { useState } from 'react';
import { api, type Endpoint } from '../api';
import { Card, Copyable, Spinner, cx } from './ui';

const METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function GateForm({ onCreated }: { onCreated: (e: Endpoint) => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [price, setPrice] = useState('0.01');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Endpoint | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const endpoint = await api.create({
        name: name.trim() || hostnameOf(url),
        upstreamUrl: url.trim(),
        method,
        priceUsd: Number(price),
        description: description.trim(),
      });
      setCreated(endpoint);
      onCreated(endpoint);
      setUrl('');
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create gate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/8 bg-gradient-to-r from-accent-500/10 to-transparent px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Gate any REST API in one click
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Paste your endpoint, set a price-per-call, and get a pay-gated URL. AI agents
          auto-pay in USDC over the x402 protocol — no Stripe, no invoices, no humans.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 p-5">
        <Field label="Your API endpoint">
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/v1/data"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Method">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {METHODS.map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price / call (USD)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                $
              </span>
              <input
                required
                type="number"
                step="any"
                min="0.0001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={cx(inputCls, 'pl-6')}
              />
            </div>
          </Field>
        </div>

        <Field label="Description (optional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this endpoint returns"
            className={inputCls}
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-600/30 transition hover:bg-accent-400 disabled:opacity-60"
        >
          {busy ? <Spinner /> : <span>⚡</span>}
          {busy ? 'Creating gate…' : 'Create gate'}
        </button>
      </form>

      {created && (
        <div className="fade-up border-t border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <span>✓</span> Gate live — your monetized URL:
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Copyable text={created.gatedUrl} />
            <span className="text-xs text-slate-400">
              charges <b className="text-slate-200">${created.priceUsd}</b> / call · hit{' '}
              <b className="text-slate-200">Run agent</b> below to watch one pay.
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'My API';
  }
}
