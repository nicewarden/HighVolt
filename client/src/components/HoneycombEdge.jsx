import { useId, useMemo } from 'react';

// Decorative header/card edge shaped like a row of honeycomb cells (replaces
// the earlier dripping-gold flourish). A solid gold bar up top blends into
// the header, with a zigzag of hexagon points hanging below it — built from
// one continuous path so adjacent cells share edges with no gaps.
const TEETH = 16;
const VIEW_W = 600;
const VIEW_H = 34;
const TOOTH_W = VIEW_W / TEETH;
const R = TOOTH_W / Math.sqrt(3);
const TOP_Y = -R * 0.5;
const MID_Y = R * 0.5;
const TIP_Y = R;

function buildPath() {
  let d = `M0,${TOP_Y}`;
  for (let i = 0; i < TEETH; i++) {
    const left = i * TOOTH_W;
    const cx = left + TOOTH_W / 2;
    const right = left + TOOTH_W;
    d += ` L${left},${MID_Y} L${cx},${TIP_Y} L${right},${MID_Y} L${right},${TOP_Y}`;
  }
  d += ` L${VIEW_W},-16 L0,-16 Z`;
  return d;
}

const PATH = buildPath();

// A soft highlight glint near the tip of every 3rd cell, for a touch of shine.
const GLINT_INDICES = [1, 4, 7, 10, 13];

export default function HoneycombEdge({ className = '' }) {
  const uid = useId();
  const fillId = `hc-fill-${uid}`;

  return (
    <svg
      className={`gold-drip ${className}`}
      viewBox="0 0 600 34"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold-shine)" />
          <stop offset="15%" stopColor="var(--gold-bright)" />
          <stop offset="45%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--gold-deep)" />
        </linearGradient>
      </defs>

      <path fill={`url(#${fillId})`} d={PATH} />
      <path fill="none" stroke="var(--gold-shadow)" strokeOpacity="0.5" strokeWidth="0.75" d={PATH} />

      {GLINT_INDICES.map(i => {
        const cx = i * TOOTH_W + TOOTH_W / 2;
        return <ellipse key={i} cx={cx} cy={MID_Y - 1} rx={TOOTH_W * 0.18} ry="2" fill="rgba(255,255,255,0.5)" />;
      })}
    </svg>
  );
}
