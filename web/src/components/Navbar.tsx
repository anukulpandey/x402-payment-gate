import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Container, btn, cx } from './ui';
import { WalletButton } from './WalletButton';
import { Logo } from './Logo';

const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/docs', label: 'Docs' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#06060b]/80 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-white">GateKeep</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavItem key={l.to} to={l.to} active={pathname === l.to}>
                {l.label}
              </NavItem>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/app" className={btn('ghost', 'sm')}>
              Dashboard
            </Link>
            <WalletButton size="sm" />
          </div>

          <button
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-white/8 bg-[#06060b] md:hidden">
          <Container>
            <nav className="flex flex-col py-3">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/app"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>
              <div className="px-3 py-2">
                <WalletButton size="sm" />
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}

function NavItem({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={cx(
        'rounded-lg px-3 py-2 text-sm transition',
        active ? 'text-white' : 'text-slate-400 hover:text-white',
      )}
    >
      {children}
    </NavLink>
  );
}
