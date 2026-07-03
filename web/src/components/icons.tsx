import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg className={props.className}>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13L13 2Z" />
    </Svg>
  );
}

export function IconCpu(props: IconProps) {
  return (
    <Svg className={props.className}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </Svg>
  );
}

export function IconChain(props: IconProps) {
  return (
    <Svg className={props.className}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </Svg>
  );
}

export function IconSplit(props: IconProps) {
  return (
    <Svg className={props.className}>
      <path d="M12 3v7" />
      <path d="M12 10c0 4-3.5 4.5-6 7" />
      <path d="M12 10c0 4 3.5 4.5 6 7" />
      <path d="M8.9 15.8 6 17l1.2-2.9" />
      <path d="M15.1 15.8 18 17l-1.2-2.9" />
    </Svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Svg className={props.className}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 8V7a2 2 0 0 1 2-2h11" />
      <path d="M21 11h-3.5a2.5 2.5 0 0 0 0 5H21" />
      <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPuzzle(props: IconProps) {
  return (
    <Svg className={props.className}>
      <path d="M10 3a2 2 0 0 1 4 0v1h3a2 2 0 0 1 2 2v3h1a2 2 0 0 1 0 4h-1v3a2 2 0 0 1-2 2h-3v1a2 2 0 0 1-4 0v-1H7a2 2 0 0 1-2-2v-3H4a2 2 0 0 1 0-4h1V6a2 2 0 0 1 2-2h3V3Z" />
    </Svg>
  );
}
