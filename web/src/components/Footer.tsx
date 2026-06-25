import { Link } from 'react-router-dom';
import { Container } from './ui';
import { Logo } from './Logo';

const COLS = [
  {
    title: 'Product',
    links: [
      { to: '/how-it-works', label: 'How it works' },
      { to: '/#pricing', label: 'Pricing' },
      { to: '/app', label: 'Dashboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/docs', label: 'Docs' },
      { to: '/docs#api', label: 'API reference' },
      { href: 'https://github.com/anukulpandey/x402-payment-gate', label: 'GitHub ↗' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/8 bg-[#070710]">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
              <span className="text-[15px] font-semibold text-white">GateKeep</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              The payment layer for AI agents. Gate any API, get paid per call in USDC.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{col.title}</div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {'href' in l && l.href ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-slate-400 transition hover:text-white">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={(l as { to: string }).to} className="text-sm text-slate-400 transition hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 py-6 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} GateKeep. Built on the x402 protocol.</span>
          <span className="flex items-center gap-3">
            <span>USDC</span>
            <span className="text-slate-700">·</span>
            <span>EIP-3009</span>
            <span className="text-slate-700">·</span>
            <span>Avalanche</span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
