"use client";

export function HintBorder({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <svg
      className="absolute inset-[-2px] w-[calc(100%+4px)] h-[calc(100%+4px)] pointer-events-none"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="rt-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff5a5f" />
          <stop offset="16%" stopColor="#fca311" />
          <stop offset="33%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#06d6a0" />
          <stop offset="66%" stopColor="#118ab2" />
          <stop offset="83%" stopColor="#9b5de5" />
          <stop offset="100%" stopColor="#ff5a5f" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="98"
        height="38"
        rx="17.5"
        fill="none"
        stroke="url(#rt-grad)"
        strokeWidth="2"
        pathLength="100"
        strokeDasharray="12 88"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-100" dur="2s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}


