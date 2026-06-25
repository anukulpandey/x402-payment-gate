import type { AppConfig } from '../api';
import { shortAddr } from '../api';
import { Badge } from './ui';

export function Header({ config }: { config: AppConfig | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07070c]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-white">GateKeep</div>
            <div className="text-[11px] text-slate-400">Stripe for AI agent API calls</div>
          </div>
        </div>

        {config && (
          <div className="flex items-center gap-2 text-xs">
            <Badge tone={config.live ? 'green' : 'violet'}>
              <span className={config.live ? 'text-emerald-400' : 'text-accent-300'}>●</span>
              {config.live ? 'on-chain settlement' : 'demo mode'}
            </Badge>
            <Badge tone="slate">
              {config.network}
              {config.chain ? ` · ${config.chain.chainId}` : ''}
            </Badge>
            <Badge tone="amber">{config.platformFeeBps / 100}% fee</Badge>
            <span className="hidden font-mono text-[11px] text-slate-500 sm:inline" title={config.platformWallet}>
              {shortAddr(config.platformWallet)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-600/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 4 5.5v6c0 4.6 3.3 8.4 8 10 4.7-1.6 8-5.4 8-10v-6L12 2Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 12.5 11 14.5 15.5 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
