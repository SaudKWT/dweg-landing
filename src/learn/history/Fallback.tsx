/**
 * No hardware WebGL2: the first well as a line elevation — the 1936 derrick
 * on its plinth, hatched in section — drawn from the same proportions the 3D
 * model uses (a 24 ft base tapering to a 5½ ft water table, panels shrinking
 * toward the crown). The catalogue plate falls back to being the technical
 * drawing it imitates. Colours are tokens through currentColor.
 */

const H = 122, BASE = 24, TOP = 5.5, PANELS = 13;

/** The derrick's members as one path, in feet, y up from the floor (flipped by the caller). */
function derrickPath(cx: number, groundY: number, scale: number) {
  const ratio = 0.93;
  const first = (H * (1 - ratio)) / (1 - Math.pow(ratio, PANELS));
  const levels = [0];
  for (let p = 0, h = first; p < PANELS; p++, h *= ratio) levels.push(levels[p] + h);
  const half = (y: number) => ((BASE + (TOP - BASE) * (y / H)) / 2) * scale;
  const Y = (y: number) => groundY - y * scale;
  const d: string[] = [];
  d.push(`M${cx - half(0)} ${Y(0)} L${cx - half(H)} ${Y(H)}`, `M${cx + half(0)} ${Y(0)} L${cx + half(H)} ${Y(H)}`);
  for (let p = 0; p < levels.length; p++) {
    const y = levels[p];
    d.push(`M${cx - half(y)} ${Y(y)} L${cx + half(y)} ${Y(y)}`);
    if (p < levels.length - 1) {
      const y2 = levels[p + 1];
      d.push(`M${cx - half(y)} ${Y(y)} L${cx + half(y2)} ${Y(y2)}`, `M${cx + half(y)} ${Y(y)} L${cx - half(y2)} ${Y(y2)}`);
    }
  }
  // Gin pole above the crown.
  d.push(`M${cx - half(H) * 0.8} ${Y(H)} L${cx} ${Y(H + 10)} L${cx + half(H) * 0.8} ${Y(H)}`);
  return d.join(" ");
}

/**
 * The derrick at logo size — this page's masthead mark, standing where INFRA
 * puts its blue tile (I's mark was the bit; here the plate is the first well).
 */
export function Mark({ className }: { className?: string }) {
  const s = 0.11;
  return (
    <svg viewBox="-4 -15.2 8 16.2" className={className} aria-hidden="true">
      <path d={`M-1.32 0 L-0.3 -13.42 L0.3 -13.42 L1.32 0 Z`} className="fill-primary/10" />
      <path d={derrickPath(0, 0, s)} fill="none" className="stroke-primary" strokeWidth={0.28} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={-3.6} x2={3.6} y1={0.2} y2={0.2} className="stroke-primary" strokeWidth={0.3} />
      <line x1={0} y1={0.8} x2={0} y2={-14.6} className="stroke-primary" strokeWidth={0.16} strokeDasharray="1.2 0.5 0.3 0.5" />
    </svg>
  );
}

/** The fallback plate: elevation over a hatched plinth, with the dial in plan beneath. */
export function Fallback() {
  const s = 3;
  const ground = 430;
  return (
    <svg viewBox="0 0 640 560" className="h-full w-full text-primary" aria-hidden="true">
      <defs>
        <pattern id="if3-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        </pattern>
      </defs>
      <ellipse cx="320" cy="505" rx="300" ry="40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <ellipse cx="320" cy="505" rx="282" ry="37" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="1 6" />
      <path d={`M60 ${ground} L580 ${ground} L580 ${ground + 66} L60 ${ground + 66} Z`} className="fill-card" stroke="currentColor" strokeWidth="1.2" />
      <path d={`M60 ${ground} L580 ${ground} L580 ${ground + 66} L60 ${ground + 66} Z`} fill="url(#if3-hatch)" />
      <path d={derrickPath(320, ground - 7, s)} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <rect x={320 - 40} y={ground - 7} width="80" height="7" className="fill-card" stroke="currentColor" strokeWidth="1.1" />
      <line x1="320" y1="40" x2="320" y2={ground + 90} stroke="currentColor" strokeWidth="0.8" strokeDasharray="14 4 3 4" opacity="0.7" />
    </svg>
  );
}
