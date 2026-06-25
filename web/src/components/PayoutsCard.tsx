import { useState } from 'react';
import { api, usd, shortAddr, type SellerStats, type WithdrawResult } from '../lib/api';
import { Card, Button, cx } from './ui';

export function PayoutsCard({
  stats,
  address,
  onWithdrawn,
}: {
  stats: SellerStats | null;
  address: string;
  onWithdrawn: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WithdrawResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = stats?.availableUsd ?? 0;
  const withdrawn = stats?.withdrawnUsd ?? 0;
  const canWithdraw = stats?.canWithdraw ?? false;
  const last = stats?.lastWithdrawal ?? null;

  async function withdraw() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.withdraw();
      setResult(r);
      onWithdrawn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span>💰</span> Available to withdraw
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-emerald-300">{usd(available)}</span>
            <span className="text-xs text-slate-500">USDC · earned {usd(withdrawn)} withdrawn so far</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Pays out on-chain to <span className="font-mono text-slate-400">{shortAddr(address)}</span> — verifiable on Snowtrace.
          </p>
        </div>
        <div className="shrink-0">
          {canWithdraw ? (
            <Button onClick={withdraw} loading={busy} disabled={available <= 0}>
              {available > 0 ? `Withdraw ${usd(available)} →` : 'Nothing to withdraw'}
            </Button>
          ) : (
            <span className="text-xs text-slate-500">On-chain payouts available in chain mode.</span>
          )}
        </div>
      </div>

      {(result || error || last) && (
        <div
          className={cx(
            'border-t px-5 py-3 text-xs',
            error ? 'border-red-500/20 bg-red-500/[0.06] text-red-300' : 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-200',
          )}
        >
          {error ? (
            error
          ) : result ? (
            <span>
              ✓ Sent {usd(result.amountUsd)} USDC to your wallet —{' '}
              <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">
                view tx on Snowtrace ↗
              </a>
            </span>
          ) : last ? (
            <span className="text-slate-400">
              Last payout: {usd(last.amountUsd)} USDC ·{' '}
              <a
                href={`https://testnet.snowtrace.io/tx/${last.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                {shortAddr(last.txHash)} ↗
              </a>
            </span>
          ) : null}
        </div>
      )}
    </Card>
  );
}
