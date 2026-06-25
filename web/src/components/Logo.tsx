export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-600/30"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 4 5.5v6c0 4.6 3.3 8.4 8 10 4.7-1.6 8-5.4 8-10v-6L12 2Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12.5 11 14.5 15.5 10"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
