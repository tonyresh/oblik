import React from 'react';

export const Logo = ({ className }: { className?: string }) => {
  const stripeElements = [];
  // Generate vertical stripes within the mask range
  for (let x = 48; x <= 152; x += 3.5) {
    stripeElements.push(
      <line
        key={x}
        x1={x}
        y1={10}
        x2={x}
        y2={210}
        className="stroke-neutral-100"
        strokeWidth="1.8"
      />
    );
  }

  return (
    <div className={`flex flex-row items-center ${className || ''}`} style={{ gap: 'clamp(6px, 0.75vw, 12px)' }}>
      <svg
        viewBox="0 0 200 220"
        style={{
          height: 'clamp(36px, 3.8vw, 56px)',
          width: 'clamp(32px, 3.4vw, 50px)',
        }}
        className="shrink-0 select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      >
        <defs>
          <mask id="logo-head-mask">
            {/* Black background masks out everything */}
            <rect x="0" y="0" width="200" height="220" fill="black" />
            {/* White head contour allows stripes to display */}
            <path
              d="M 100 38 C 148 38, 148 85, 148 100 C 148 125, 132 150, 100 188 C 68 150, 52 125, 52 100 C 52 85, 52 38, 100 38 Z"
              fill="white"
            />
            {/* Black eyes mask out the eyes space */}
            <path
              d="M 94 136 C 90 126, 75 118, 56 110 C 65 125, 80 135, 94 136 Z"
              fill="black"
            />
            <path
              d="M 106 136 C 110 126, 125 118, 144 110 C 135 125, 120 135, 106 136 Z"
              fill="black"
            />
          </mask>
        </defs>

        {/* Outer Hexagon in solid black, with a refined outer border */}
        <polygon
          points="100,10 190,62 190,158 100,210 10,158 10,62"
          className="fill-neutral-950 stroke-neutral-300 dark:stroke-neutral-700"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Vertical stripes masked to form the face graphic */}
        <g mask="url(#logo-head-mask)">
          {stripeElements}
        </g>
      </svg>
      <span
        style={{ fontSize: 'clamp(13px, 1.35vw, 20px)' }}
        className="text-foreground font-extrabold tracking-[0.08em] uppercase font-sans portrait:hidden whitespace-nowrap"
      >
        412 Nemesis
      </span>
    </div>
  );
};

