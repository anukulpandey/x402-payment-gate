import { useEffect, useRef, useState } from 'react';
import { useWallet } from '../lib/wallet';
import { useAuth } from '../lib/auth';
import { shortAddr } from '../lib/api';
import { Button, btn, cx } from './ui';

export function WalletButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const wallet = useWallet();
  const { address, signIn, signOut, signingIn, error } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Signed in → address pill + menu.
  if (address) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cx(btn('secondary', size), 'font-mono')}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {shortAddr(address)}
          <span className="text-slate-500">▾</span>
        </button>
        {open && (
          <div className="fade-up absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0c0c14] shadow-2xl">
            <div className="border-b border-white/8 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">Signed in as</div>
              <div className="truncate font-mono text-xs text-slate-200">{address}</div>
            </div>
            <a
              href={`https://testnet.snowtrace.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              View on Snowtrace ↗
            </a>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="block w-full px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // No injected wallet.
  if (!wallet.hasProvider) {
    return (
      <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className={btn('primary', size)}>
        🦊 Install MetaMask
      </a>
    );
  }

  // Connect + sign in.
  return (
    <div className="relative" ref={ref}>
      <Button size={size} loading={signingIn} onClick={() => signIn().catch(() => undefined)}>
        {!signingIn && <WalletIcon />}
        {signingIn ? 'Check wallet…' : 'Connect Wallet'}
      </Button>
      {error && !signingIn && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 9h13a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
