import { useState } from 'react';

/**
 * HeroFlow — animated x402 payment-flow hero visual.
 *
 * One 8s loop, phase-locked between SMIL <animateMotion> travelers (position)
 * and CSS keyframes (visibility windows, badge pops, glows):
 *
 *   2–14%   request pulse: agent → gate
 *   15–18%  "402 · $0.01" badge pops above the gate (amber shield blip)
 *   22–26%  "EIP-712 sig" pill + signature squiggle above the agent
 *   42–55%  payment pulse: agent → gate → API (API rect flashes 55–60%)
 *   57–66%  response pulse: API → agent
 *   62–65%  "200 OK" badge (green shield blip)
 *   68–84%  USDC coin: gate → wallet
 *   84–88%  "+ $0.009" pops at the wallet
 *
 * Reduced motion renders the settled end-state: paths fully drawn, "200 OK"
 * visible, coin resting at the wallet, earnings shown — no SMIL, no loops.
 */

const MONO = 'ui-monospace, monospace';

/*
 * Co-located styles: every hf-* animation below is phase-locked to the SMIL
 * keyTimes in this exact markup (all loops 8s linear infinite), so they live
 * here next to the SVG instead of index.css.
 */
const HF_STYLES = `
/* --- entrance ---------------------------------------------------------- */
.hero-flow .hf-path {
  stroke-dasharray: 1;
  animation: hfDraw 0.9s ease-out both;
}
.hero-flow .hf-path:nth-of-type(2) { animation-delay: 0.12s; }
.hero-flow .hf-path:nth-of-type(3) { animation-delay: 0.24s; }
@keyframes hfDraw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}

.hero-flow .hf-node { animation: hfNode 0.45s ease both; }
.hero-flow .hf-node:nth-of-type(2) { animation-delay: 0.08s; }
.hero-flow .hf-node:nth-of-type(3) { animation-delay: 0.16s; }
.hero-flow .hf-node:nth-of-type(4) { animation-delay: 0.24s; }
@keyframes hfNode {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.hero-flow .hf-pop {
  transform-box: fill-box;
  transform-origin: center;
}

/* --- traveler visibility windows (parked = invisible) ------------------ */
.hero-flow .hf-pulse-req { animation: hfWinReq 8s linear infinite; }
.hero-flow .hf-pulse-pay { animation: hfWinPay 8s linear infinite; }
.hero-flow .hf-pulse-res { animation: hfWinRes 8s linear infinite; }
.hero-flow .hf-coin      { animation: hfWinCoin 8s linear infinite; }
@keyframes hfWinReq  { 0%, 1%  { opacity: 0; } 3%, 13%  { opacity: 1; } 15%, 100% { opacity: 0; } }
@keyframes hfWinPay  { 0%, 41% { opacity: 0; } 43%, 54% { opacity: 1; } 56%, 100% { opacity: 0; } }
@keyframes hfWinRes  { 0%, 56% { opacity: 0; } 58%, 65% { opacity: 1; } 67%, 100% { opacity: 0; } }
@keyframes hfWinCoin { 0%, 66% { opacity: 0; } 68%, 84% { opacity: 1; } 86%, 100% { opacity: 0; } }

/* --- badge / pill pops -------------------------------------------------- */
.hero-flow .hf-badge-402 { animation: hfBadge402 8s linear infinite; }
.hero-flow .hf-sig       { animation: hfSig 8s linear infinite; }
.hero-flow .hf-badge-200 { animation: hfBadge200 8s linear infinite; }
@keyframes hfBadge402 {
  0%, 15% { opacity: 0; transform: scale(0.85); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
  18%, 40% { opacity: 1; transform: scale(1); }
  44%, 100% { opacity: 0; transform: scale(0.85); }
}
@keyframes hfSig {
  0%, 22% { opacity: 0; transform: scale(0.85); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
  26%, 40% { opacity: 1; transform: scale(1); }
  44%, 100% { opacity: 0; transform: scale(0.85); }
}
@keyframes hfBadge200 {
  0%, 62% { opacity: 0; transform: scale(0.85); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
  65%, 92% { opacity: 1; transform: scale(1); }
  96%, 100% { opacity: 0; transform: scale(0.85); }
}

.hero-flow .hf-sig-stroke {
  stroke-dasharray: 1;
  animation: hfSigDraw 8s linear infinite;
}
@keyframes hfSigDraw {
  0%, 25% { stroke-dashoffset: 1; }
  34%, 43.9% { stroke-dashoffset: 0; }
  44%, 100% { stroke-dashoffset: 1; }
}

.hero-flow .hf-earn {
  transform-box: fill-box;
  transform-origin: center;
  animation: hfEarn 8s linear infinite;
}
@keyframes hfEarn {
  0%, 84% { opacity: 0; transform: translateY(4px); }
  88%, 95% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(4px); }
}

/* shield blips: amber at the 402, green at the 200 */
.hero-flow .hf-shield { animation: hfShieldGlow 8s linear infinite; }
@keyframes hfShieldGlow {
  0%, 15% { filter: drop-shadow(0 0 0 rgba(245, 158, 11, 0)); }
  17.5% { filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.6)); }
  20% { filter: drop-shadow(0 0 0 rgba(245, 158, 11, 0)); }
  62% { filter: drop-shadow(0 0 0 rgba(52, 211, 153, 0)); }
  64.5% { filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.6)); }
  67%, 100% { filter: drop-shadow(0 0 0 rgba(52, 211, 153, 0)); }
}

/* API rect flash while the payment pulse arrives */
.hero-flow .hf-api-rect { animation: hfApiFlash 8s linear infinite; }
@keyframes hfApiFlash {
  0%, 55% { stroke: rgba(255, 255, 255, 0.1); filter: drop-shadow(0 0 0 rgba(129, 140, 248, 0)); }
  57.5% { stroke: rgba(129, 140, 248, 0.8); filter: drop-shadow(0 0 8px rgba(129, 140, 248, 0.35)); }
  60%, 100% { stroke: rgba(255, 255, 255, 0.1); filter: drop-shadow(0 0 0 rgba(129, 140, 248, 0)); }
}

/* --- static / reduced-motion ------------------------------------------- */
.hf-static,
.hf-static * { animation: none !important; }

@media (prefers-reduced-motion: reduce) {
  .hero-flow [class*='hf-'] { animation: none !important; }
}
`;

/** Green "200 OK" badge above the gate. Animated mode adds the pop classes. */
function Badge200({ animated }: { animated: boolean }) {
  return (
    <g id="hf-badge-200" className={animated ? 'hf-pop hf-badge-200' : undefined}>
      <rect
        x={243}
        y={48}
        width={74}
        height={24}
        rx={12}
        fill="rgba(52,211,153,0.12)"
        stroke="rgba(52,211,153,0.35)"
      />
      <path
        d="M254 60 l4 4 7-8"
        stroke="#34d399"
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x={292} y={64} textAnchor="middle" fontFamily={MONO} fontSize={10} fill="#34d399">
        200 OK
      </text>
    </g>
  );
}

/** USDC coin. Animated mode travels gate→wallet; static rests at the wallet. */
function Coin({ animated }: { animated: boolean }) {
  return (
    <g className={animated ? 'hf-coin' : undefined} transform={animated ? undefined : 'translate(426 266)'}>
      <circle r={9} fill="url(#hf-coin)" />
      {/* centered at (0, 3.5): animateMotion moves the group origin */}
      <text x={0} y={3.5} textAnchor="middle" fontFamily={MONO} fontSize={10} fontWeight="bold" fill="#fff">
        $
      </text>
      {animated && (
        <animateMotion
          dur="8s"
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.68;0.84;1"
          keyPoints="0;0;1;1"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1;0.4 0 0.2 1"
        >
          <mpath href="#hf-p3" />
        </animateMotion>
      )}
    </g>
  );
}

export function HeroFlow() {
  // Detect once at mount; the settled static scene is rendered instead of
  // re-styling the animated one.
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  return (
    <>
      <style>{HF_STYLES}</style>
      <svg
        viewBox="0 0 560 340"
        role="img"
        aria-labelledby="hf-title hf-desc"
        className={`hero-flow w-full max-w-[560px]${reduced ? ' hf-static' : ''}`}
        style={{ userSelect: 'none' }}
      >
        <title id="hf-title">x402 payment flow</title>
        <desc id="hf-desc">
          An AI agent pays a GateKeep gate in USDC and receives the API response; the seller wallet
          is credited.
        </desc>

        <defs>
          <linearGradient id="hf-line" x1={0} y1={0} x2={1} y2={0}>
            <stop offset={0} stopColor="#6366f1" />
            <stop offset={1} stopColor="#a5b4fc" />
          </linearGradient>
          <radialGradient id="hf-coin">
            <stop offset={0} stopColor="#34d399" />
            <stop offset={1} stopColor="#059669" />
          </radialGradient>
          {/* generous region so the blur is not clipped to the tiny bbox */}
          <filter id="hf-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation={4} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* invisible motion paths for the SMIL travelers */}
          <path id="hf-p1" d="M134 130 H 225" />
          <path id="hf-p12" d="M134 130 H 426" />
          <path id="hf-p21" d="M426 130 H 134" />
          <path id="hf-p3" d="M300 174 C 330 230 380 266 426 266" />
        </defs>

        {/* visible connection paths */}
        <g stroke="url(#hf-line)" strokeWidth={1.5} opacity={0.35} fill="none">
          <path className={reduced ? undefined : 'hf-path'} pathLength={1} d="M134 130 H 225" />
          <path className={reduced ? undefined : 'hf-path'} pathLength={1} d="M335 130 H 426" />
          <path
            className={reduced ? undefined : 'hf-path'}
            pathLength={1}
            d="M300 174 C 330 230 380 266 426 266"
          />
        </g>

        {/* nodes (wrapper g keeps :nth-of-type stagger counting correct) */}
        <g>
          {/* AGENT */}
          <g className="hf-node">
            <rect
              x={24}
              y={94}
              width={110}
              height={72}
              rx={14}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.10)"
            />
            {/* robot: antenna + head + eyes */}
            <path d="M79 106 V 100" stroke="#a5b4fc" strokeWidth={1.4} strokeLinecap="round" />
            <circle cx={79} cy={99} r={1.5} fill="#a5b4fc" />
            <rect x={67} y={106} width={24} height={17} rx={4} fill="none" stroke="#a5b4fc" strokeWidth={1.4} />
            <circle cx={74} cy={114.5} r={1.7} fill="#a5b4fc" />
            <circle cx={84} cy={114.5} r={1.7} fill="#a5b4fc" />
            <text x={79} y={143} textAnchor="middle" fontFamily={MONO} fontSize={11} fill="#94a3b8" letterSpacing="0.08em">
              AGENT
            </text>
            <text x={79} y={156} textAnchor="middle" fontFamily={MONO} fontSize={9} fill="#64748b">
              x402 client
            </text>
          </g>

          {/* GATEKEEP */}
          <g className="hf-node">
            <rect
              x={225}
              y={86}
              width={110}
              height={88}
              rx={16}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(99,102,241,0.35)"
            />
            {/* 24x24 shield scaled to ~28px, centered at x=280 */}
            <path
              className="hf-shield"
              d="M12 2 4 5.5v6c0 4.6 3.3 8.4 8 10 4.7-1.6 8-5.4 8-10v-6L12 2Z"
              transform="translate(266 94) scale(1.167)"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            <text x={280} y={148} textAnchor="middle" fontFamily={MONO} fontSize={11} fill="#94a3b8" letterSpacing="0.08em">
              GATEKEEP
            </text>
            <text x={280} y={161} textAnchor="middle" fontFamily={MONO} fontSize={9} fill="#64748b">
              402 gate
            </text>
          </g>

          {/* YOUR API */}
          <g className="hf-node">
            <rect
              className="hf-api-rect"
              x={426}
              y={94}
              width={110}
              height={72}
              rx={14}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(255,255,255,0.10)"
            />
            <text x={481} y={123} textAnchor="middle" fontFamily={MONO} fontSize={16} fill="#a5b4fc">
              {'{ }'}
            </text>
            <text x={481} y={143} textAnchor="middle" fontFamily={MONO} fontSize={11} fill="#94a3b8" letterSpacing="0.08em">
              YOUR API
            </text>
            <text x={481} y={156} textAnchor="middle" fontFamily={MONO} fontSize={9} fill="#64748b">
              REST upstream
            </text>
          </g>

          {/* YOUR WALLET */}
          <g className="hf-node">
            <rect
              x={426}
              y={236}
              width={110}
              height={60}
              rx={14}
              fill="rgba(255,255,255,0.03)"
              stroke="rgba(16,185,129,0.25)"
            />
            <text x={481} y={261} textAnchor="middle" fontFamily={MONO} fontSize={11} fill="#94a3b8" letterSpacing="0.08em">
              YOUR WALLET
            </text>
            <text
              id="hf-earn"
              className={reduced ? undefined : 'hf-earn'}
              x={481}
              y={281}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fill="#34d399"
            >
              + $0.009
            </text>
          </g>
        </g>

        {/* FX layer */}
        <g aria-hidden="true">
          {reduced ? (
            <>
              <Badge200 animated={false} />
              <Coin animated={false} />
            </>
          ) : (
            <>
              {/* request pulse: agent → gate */}
              <circle id="hf-pulse-req" className="hf-pulse-req" r={5} fill="#818cf8" filter="url(#hf-glow)">
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  calcMode="linear"
                  keyTimes="0;0.02;0.14;1"
                  keyPoints="0;0;1;1"
                >
                  <mpath href="#hf-p1" />
                </animateMotion>
              </circle>

              {/* 402 badge above the gate */}
              <g id="hf-badge-402" className="hf-pop hf-badge-402">
                <rect
                  x={243}
                  y={48}
                  width={74}
                  height={24}
                  rx={12}
                  fill="rgba(245,158,11,0.12)"
                  stroke="rgba(245,158,11,0.35)"
                />
                <text x={280} y={64} textAnchor="middle" fontFamily={MONO} fontSize={10} fill="#fbbf24">
                  402 · $0.01
                </text>
              </g>

              {/* EIP-712 signature pill above the agent */}
              <g id="hf-sig" className="hf-pop hf-sig">
                <rect
                  x={37}
                  y={53}
                  width={84}
                  height={22}
                  rx={11}
                  fill="rgba(99,102,241,0.12)"
                  stroke="rgba(99,102,241,0.3)"
                />
                <text x={79} y={68} textAnchor="middle" fontFamily={MONO} fontSize={10} fill="#a5b4fc">
                  EIP-712 sig
                </text>
                <path
                  className="hf-sig-stroke"
                  d="M45 80 q6 -6 12 0 t12 0 t12 0"
                  pathLength={1}
                  stroke="#818cf8"
                  strokeWidth={1.2}
                  fill="none"
                />
              </g>

              {/* payment pulse + ring: agent → gate → API */}
              <g id="hf-pulse-pay" className="hf-pulse-pay">
                <circle r={5} fill="#818cf8" />
                <circle r={8} stroke="#818cf8" strokeWidth={1} fill="none" opacity={0.5} />
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  calcMode="linear"
                  keyTimes="0;0.42;0.55;1"
                  keyPoints="0;0;1;1"
                >
                  <mpath href="#hf-p12" />
                </animateMotion>
              </g>

              {/* response pulse: API → agent */}
              <circle id="hf-pulse-res" className="hf-pulse-res" r={4.5} fill="#34d399" filter="url(#hf-glow)">
                <animateMotion
                  dur="8s"
                  repeatCount="indefinite"
                  calcMode="linear"
                  keyTimes="0;0.57;0.66;1"
                  keyPoints="0;0;1;1"
                >
                  <mpath href="#hf-p21" />
                </animateMotion>
              </circle>

              <Badge200 animated />

              {/* USDC coin: gate → wallet */}
              <Coin animated />
            </>
          )}
        </g>
      </svg>
    </>
  );
}
