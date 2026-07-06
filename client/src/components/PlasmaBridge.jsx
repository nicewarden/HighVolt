import { useId } from 'react';

// The header/footer divider, styled as an arc of gold plasma/electricity
// wiggling across the bar. Points are connected with a Catmull-Rom spline
// (converted to cubic beziers) instead of straight zigzag segments, so the
// bolt reads as a smooth, fluid arc rather than a jagged line. Multiple
// glow/core/spark layers on the same morphing curve, plus a flickering
// opacity, give it a plasma/electric-arc feel instead of a static ribbon.
const SEGMENTS = 14;
const WIDTH = 600;
const BASELINE = 20;
const STEP = WIDTH / SEGMENTS;

// Catmull-Rom -> cubic bezier, so a handful of noisy points reads as one
// continuous, curvy arc instead of straight hops between them.
function smoothPath(offsets) {
  const pts = offsets.map((o, i) => ({ x: i * STEP, y: BASELINE + o }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}

const VARIANT_A = smoothPath([0, 9, -7, 12, -10, 8, -13, 10, -8, 11, -9, 7, -12, 9, 0]);
const VARIANT_B = smoothPath([0, -8, 10, -12, 9, -7, 12, -9, 8, -10, 10, -8, 9, -11, 0]);
const VARIANT_C = smoothPath([0, 10, -9, 8, -11, 12, -8, 9, -12, 8, -10, 9, -7, 10, 0]);
const VARIANT_D = smoothPath([0, -6, 8, -9, 13, -8, 7, -13, 9, -7, 11, -9, 8, -8, 0]);
const MORPH_VALUES = `${VARIANT_A};${VARIANT_B};${VARIANT_C};${VARIANT_D};${VARIANT_A}`;

// A thinner, faster, out-of-phase secondary arc so it reads as two crackling
// strands of current rather than one uniform ribbon.
const SPARK_A = smoothPath([0, -4, 6, -10, 5, -8, 11, -6, 9, -11, 6, -9, 7, -5, 0]);
const SPARK_B = smoothPath([0, 7, -9, 5, -10, 9, -6, 10, -8, 6, -9, 8, -5, 9, 0]);
const SPARK_VALUES = `${SPARK_A};${SPARK_B};${SPARK_A}`;

export default function PlasmaBridge({ className = '' }) {
  const uid = useId();
  const glowId = `pb-glow-${uid}`;

  return (
    <svg
      className={`plasma-bridge ${className}`}
      viewBox={`0 0 ${WIDTH} 40`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={glowId} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={VARIANT_A} fill="none" stroke="var(--gold)" strokeWidth="7" strokeLinecap="round" opacity="0.5" filter={`url(#${glowId})`}>
        <animate attributeName="d" values={MORPH_VALUES} dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.32;0.55;0.4;0.5" dur="0.7s" repeatCount="indefinite" />
      </path>
      <path d={VARIANT_A} fill="none" stroke="var(--gold-bright)" strokeWidth="2.4" strokeLinecap="round">
        <animate attributeName="d" values={MORPH_VALUES} dur="1.6s" repeatCount="indefinite" />
      </path>
      <path d={SPARK_A} fill="none" stroke="var(--gold-shine)" strokeWidth="1" strokeLinecap="round" opacity="0.75">
        <animate attributeName="d" values={SPARK_VALUES} dur="0.9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.75;0.15;0.8;0.25;0.75" dur="0.45s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
