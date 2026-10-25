/**
 * The page's line drawings, in I's plate style: KOC-blue ink on the page,
 * mono small caps for figures, italic serif for names.
 *
 *   ColumnFigure  the Kuwait column, inline in chapter 03
 *   BitFigure     fixed-cutter (PDC) beside roller-cone, inline in chapter 06
 *   FallbackFor   a drawing for every stop when there is no hardware WebGL2
 */

import { BOTTOM, ROLE_LABEL, UNITS, type Lith } from "./gl/geology";
import { FAILAKA, FIELDS, MAINLAND, PLACES, type Region } from "./gl/map";
import { STOPS, stopIndex } from "./gl/stops";
import { CASING, FORMATIONS, OPEN_HOLE, TD, station } from "./gl/well";

const MONO = "var(--font-mono)";
const SERIF = "var(--font-serif, Georgia, serif)";

/* ------------------------------------------------------------------------ */
/* Lithology patterns, shared by every drawing that shows rock               */

function LithPatterns({ id }: { id: string }) {
  const ink = { stroke: "currentColor", strokeWidth: 0.7, fill: "none" } as const;
  return (
    <defs>
      <pattern id={`${id}-gravel`} width="10" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2" r="1.4" {...ink} />
        <circle cx="7.5" cy="6" r="1.4" {...ink} />
      </pattern>
      <pattern id={`${id}-sand`} width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="0.7" fill="currentColor" />
        <circle cx="4.5" cy="4.5" r="0.7" fill="currentColor" />
      </pattern>
      <pattern id={`${id}-shale`} width="12" height="5" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2.5" x2="7" y2="2.5" {...ink} />
      </pattern>
      <pattern id={`${id}-limestone`} width="16" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0.35H16M0 4.35H16M4 0V4M12 4V8" {...ink} />
      </pattern>
      <pattern id={`${id}-dolomite`} width="16" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0.35H16M0 4.35H16M3 0L5 4M11 4L13 8" {...ink} />
      </pattern>
      <pattern id={`${id}-anhydrite`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" {...ink} />
      </pattern>
      <pattern id={`${id}-marl`} width="16" height="8" patternUnits="userSpaceOnUse">
        <path d="M0 0.35H11M8 4.35H16" {...ink} />
        <circle cx="4" cy="5.5" r="0.6" fill="currentColor" />
      </pattern>
    </defs>
  );
}

const LITH_NAME: Record<Lith, string> = {
  gravel: "Sand and gravel",
  sand: "Sandstone",
  shale: "Shale",
  limestone: "Limestone",
  dolomite: "Dolomite",
  anhydrite: "Anhydrite / salt",
  marl: "Marl and limestone",
};

/* ------------------------------------------------------------------------ */
/* The column                                                                */

/**
 * The Kuwait column at the crest of the block, to depth scale. Reservoirs are
 * tinted, seals carry a mark — the two words chapter 03 is about.
 */
export function ColumnFigure({ className }: { className?: string }) {
  const H = 620;
  const W = 520;
  const y = (tvd: number) => 18 + (tvd / BOTTOM) * H;
  // Thin units crowd: push each name down until it clears the one above.
  const labelY: number[] = [];
  UNITS.forEach((u, i) => {
    const want = (y(u.top) + y(UNITS[i + 1]?.top ?? BOTTOM)) / 2;
    labelY.push(i ? Math.max(want, labelY[i - 1] + 15) : want);
  });
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="h-auto w-full text-primary" role="img" aria-labelledby="learn-col-title learn-col-desc">
        <title id="learn-col-title">The Kuwait column, simplified</title>
        <desc id="learn-col-desc">
          {UNITS.map((u) => `${u.name}, ${u.age}, ${LITH_NAME[u.lith].toLowerCase()}, ${ROLE_LABEL[u.role].toLowerCase()}`).join("; ")}.
        </desc>
        <LithPatterns id="col" />
        {UNITS.map((u, i) => {
          const y0 = y(u.top);
          const y1 = y(UNITS[i + 1]?.top ?? BOTTOM);
          const mid = labelY[i];
          const bar = (y0 + y1) / 2;
          const res = u.role === "reservoir";
          return (
            <g key={u.name}>
              <rect x={74} y={y0} width={70} height={y1 - y0} className={res ? "fill-primary/15" : "fill-card"} />
              <rect x={74} y={y0} width={70} height={y1 - y0} fill={`url(#col-${u.lith})`} opacity={0.75} />
              <line x1={74} x2={144} y1={y0} y2={y0} stroke="currentColor" strokeWidth={0.75} />
              {(i === 0 || y0 - y(UNITS[i - 1].top) >= 11) && (
                <text x={66} y={y0 + 3.5} textAnchor="end" fontSize={9} fontFamily={MONO} className="fill-muted-foreground">
                  {u.top.toLocaleString("en-GB")}
                </text>
              )}
              <path d={`M148 ${bar} L156 ${bar} L164 ${mid} L168 ${mid}`} fill="none" className="stroke-muted-foreground" strokeWidth={0.6} />
              <text x={172} y={mid + 4} fontSize={12.5} fontFamily={SERIF} fontStyle="italic" className="fill-foreground">
                {u.name}
              </text>
              <text x={330} y={mid + 3.5} fontSize={8.5} fontFamily={MONO} className="fill-muted-foreground" letterSpacing="0.06em">
                {u.age.toUpperCase()}
              </text>
              <text x={W - 4} y={mid + 3.5} textAnchor="end" fontSize={8.5} fontFamily={MONO} letterSpacing="0.06em" className={res ? "fill-primary font-semibold" : "fill-muted-foreground"}>
                {ROLE_LABEL[u.role].toUpperCase()}
              </text>
            </g>
          );
        })}
        <rect x={74} y={y(0)} width={70} height={H} fill="none" stroke="currentColor" strokeWidth={1} />
        <text x={66} y={H + 34} textAnchor="end" fontSize={9} fontFamily={MONO} className="fill-muted-foreground">
          FT TVD
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        <span className="font-mono">Fig. 3.1</span> — The column, simplified and grouped. Order, rock type and role follow
        the published Kuwait column; depths are illustrative crest depths, not a KOC well.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Bits                                                                      */

/** A fixed-cutter PDC bit and a roller-cone bit, face on. */
export function BitFigure({ className }: { className?: string }) {
  const blades = 6;
  return (
    <figure className={className}>
      <svg viewBox="0 0 520 250" className="h-auto w-full text-primary" role="img" aria-labelledby="learn-bit-title">
        <title id="learn-bit-title">A PDC bit and a roller-cone bit, seen from below</title>
        {/* PDC */}
        <g transform="translate(130 118)">
          <circle r={92} fill="none" stroke="currentColor" strokeWidth={1} />
          <circle r={86} className="fill-card" />
          {Array.from({ length: blades }, (_, b) => {
            const a = (b / blades) * Math.PI * 2;
            const sweep = 0.55;
            const pts = Array.from({ length: 9 }, (_, i) => {
              const r = 14 + i * 9;
              const t = a + (i / 8) * sweep;
              return [Math.cos(t) * r, Math.sin(t) * r];
            });
            return (
              <g key={b}>
                <path d={`M${pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L")}`} fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round" opacity={0.18} />
                {pts.slice(b % 2 ? 1 : 2).map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={3.6} className="fill-background" stroke="currentColor" strokeWidth={1.1} />
                ))}
              </g>
            );
          })}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5;
            return <circle key={i} cx={Math.cos(a) * 30} cy={Math.sin(a) * 30} r={3} className="fill-primary" />;
          })}
        </g>
        {/* Roller cone */}
        <g transform="translate(390 118)">
          <circle r={92} fill="none" stroke="currentColor" strokeWidth={1} />
          <circle r={86} className="fill-card" />
          {[0, 1, 2].map((c) => {
            const a = (c / 3) * Math.PI * 2 - Math.PI / 2;
            return (
              <g key={c} transform={`rotate(${(a * 180) / Math.PI})`}>
                <path d="M10 -26 L80 -34 Q88 0 80 34 L10 26 Q4 0 10 -26Z" className="fill-background" stroke="currentColor" strokeWidth={1.1} />
                {[22, 40, 58, 74].map((x, row) =>
                  Array.from({ length: 3 + row }, (_, k) => {
                    const span = 18 + row * 4.5;
                    const yy = -span + (k * (2 * span)) / (2 + row);
                    return <path key={`${row}-${k}`} d={`M${x - 3} ${yy + 3} L${x} ${yy - 3} L${x + 3} ${yy + 3}Z`} fill="currentColor" opacity={0.75} />;
                  }),
                )}
              </g>
            );
          })}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
            return <circle key={i} cx={Math.cos(a) * 70} cy={Math.sin(a) * 70} r={3} className="fill-primary" />;
          })}
        </g>
        <text x={130} y={242} textAnchor="middle" fontSize={13} fontFamily={SERIF} fontStyle="italic" className="fill-foreground">
          Fixed cutter (PDC)
        </text>
        <text x={390} y={242} textAnchor="middle" fontSize={13} fontFamily={SERIF} fontStyle="italic" className="fill-foreground">
          Roller cone (tricone)
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        <span className="font-mono">Fig. 6.1</span> — Blue dots: nozzles, where the mud leaves the bit. Schematic, not to scale.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------------ */
/* Fallbacks                                                                 */

/** The drawing to show at a stop when the plate cannot be rendered. */
export function FallbackFor({ stop }: { stop: string }) {
  const s = STOPS[stopIndex(stop)];
  return (
    <div className="absolute inset-0 grid place-items-center p-6 pb-20 pt-12" aria-hidden="true">
      {s.scene === "map" ? (
        <MapDrawing region={s.region} />
      ) : s.scene === "block" ? (
        <ColumnFigure className="w-full max-w-md" />
      ) : s.hud || stop === "descend" ? (
        <WellDrawing />
      ) : (
        <RigDrawing />
      )}
    </div>
  );
}

/** Kuwait and its fields, in plan. */
export function MapDrawing({ region }: { region?: Region }) {
  const lon0 = 46.5, lon1 = 48.5, lat0 = 28.45, lat1 = 30.15;
  const cos = Math.cos((29.3 * Math.PI) / 180);
  const W = 600;
  const kx = W / ((lon1 - lon0) * cos);
  const Hh = (lat1 - lat0) * kx;
  const px = (lon: number) => (lon - lon0) * cos * kx;
  const py = (lat: number) => (lat1 - lat) * kx;
  const path = (ring: [number, number][]) => `M${ring.map(([lo, la]) => `${px(lo).toFixed(1)} ${py(la).toFixed(1)}`).join(" L")}Z`;
  return (
    <svg viewBox={`-10 -10 ${W + 20} ${Hh + 20}`} className="h-full max-h-[34rem] w-full text-primary">
      {[28.5, 29, 29.5, 30].map((la) => (
        <line key={la} x1={0} x2={W} y1={py(la)} y2={py(la)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
      ))}
      {[46.5, 47, 47.5, 48, 48.5].map((lo) => (
        <line key={lo} y1={0} y2={Hh} x1={px(lo)} x2={px(lo)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
      ))}
      <path d={path(MAINLAND)} className="fill-card" stroke="currentColor" strokeWidth={1.2} />
      <path d={path(FAILAKA)} className="fill-card" stroke="currentColor" strokeWidth={1.2} />
      {FIELDS.map((f) => {
        const on = !region || f.region === region;
        const rx = (f.axes[1] / 111) * kx * cos;
        const ry = (f.axes[0] / 111) * kx;
        return (
          <g key={f.name} opacity={on ? 1 : 0.35}>
            <ellipse cx={px(f.at[0])} cy={py(f.at[1])} rx={rx} ry={ry} transform={`rotate(${f.bearing} ${px(f.at[0])} ${py(f.at[1])})`} className="fill-primary/20" stroke="currentColor" />
            <text x={px(f.at[0]) + rx + 6} y={py(f.at[1]) + 4} fontSize={12} fontFamily={SERIF} fontStyle="italic" className="fill-foreground">
              {f.name}
            </text>
          </g>
        );
      })}
      {PLACES.map((p) => (
        <text key={p.name} x={px(p.at[0])} y={py(p.at[1])} fontSize={9} fontFamily={MONO} letterSpacing="0.06em" textAnchor="middle" className="fill-muted-foreground">
          {p.name.toUpperCase()}
        </text>
      ))}
    </svg>
  );
}

/** The illustrative well as a flat engineering section (F·E·I's fallback). */
export function WellDrawing() {
  const pts = Array.from({ length: 160 }, (_, i) => station((TD * i) / 159));
  const maxX = 4700;
  const maxY = 4950;
  const x = (d: number) => 60 + (d / maxX) * 880;
  const y = (t: number) => 40 + (t / maxY) * 560;
  const bottoms = [...FORMATIONS.slice(1).map((f) => f.top), 4900];
  const mark = (md: number, text: string, dy = -10, end = false) => {
    const s = station(md);
    return (
      <g key={text}>
        <circle cx={x(s.disp)} cy={y(s.tvd)} r={4.5} className="fill-primary" />
        <text x={x(s.disp) + (end ? -10 : 10)} y={y(s.tvd) + dy} textAnchor={end ? "end" : "start"} fontSize={11} fill="currentColor" fontFamily={MONO} className="text-foreground">
          {text.toUpperCase()}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet" className="h-auto w-full text-muted-foreground">
      {FORMATIONS.map((f, i) => (
        <g key={f.name}>
          <rect x={20} width={960} y={y(f.top)} height={y(bottoms[i]) - y(f.top)} className="fill-primary" fillOpacity={i % 2 ? 0.05 : 0.1} />
          <line x1={20} x2={980} y1={y(f.top)} y2={y(f.top)} stroke="currentColor" strokeOpacity={0.35} />
          <text x={976} y={(y(f.top) + y(bottoms[i])) / 2 + 3.5} fontSize={9.5} textAnchor="end" fill="currentColor" fontFamily={MONO}>
            {f.name.toUpperCase()}
          </text>
        </g>
      ))}
      <line x1={20} x2={980} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.5} />
      <polyline points={pts.map((s) => `${x(s.disp)},${y(s.tvd)}`).join(" ")} fill="none" className="text-primary" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
      {mark(CASING[1].shoe, "13⅜″ shoe · 1,600 ft")}
      {mark(3000, "KOP · 3,000 ft")}
      {mark(OPEN_HOLE.top, "Lands · 9⅝″ shoe", 20)}
      {mark(TD, "TD · 8,150 ft MD", 20, true)}
    </svg>
  );
}

/** A land rig in elevation, every system named. */
export function RigDrawing() {
  const label = (x: number, y: number, text: string, anchor: "start" | "end" = "start") => (
    <text x={x} y={y} fontSize={12} fontFamily={SERIF} fontStyle="italic" textAnchor={anchor} className="fill-foreground">
      {text}
    </text>
  );
  return (
    <svg viewBox="0 0 640 520" className="h-full max-h-[34rem] w-full text-primary">
      <line x1={10} x2={630} y1={470} y2={470} stroke="currentColor" strokeOpacity={0.5} />
      {/* substructure, floor, mast */}
      <path d="M250 470 L250 420 L390 420 L390 470 M250 470 L390 420 M390 470 L250 420" fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={240} y={412} width={160} height={8} className="fill-card" stroke="currentColor" />
      <path d="M290 412 L312 60 L328 60 L350 412" fill="none" stroke="currentColor" strokeWidth={1.4} />
      {Array.from({ length: 14 }, (_, i) => {
        const t0 = i / 14, t1 = (i + 1) / 14;
        const xl = (t: number) => 290 + 22 * t, xr = (t: number) => 350 - 22 * t, yy = (t: number) => 412 - 352 * t;
        return <path key={i} d={`M${xl(t0)} ${yy(t0)} L${xr(t1)} ${yy(t1)} M${xr(t0)} ${yy(t0)} L${xl(t1)} ${yy(t1)}`} stroke="currentColor" strokeOpacity={0.4} strokeWidth={0.7} />;
      })}
      <rect x={302} y={48} width={36} height={12} className="fill-primary" />
      <line x1={320} x2={320} y1={60} y2={190} stroke="currentColor" strokeWidth={0.8} />
      <rect x={312} y={190} width={16} height={18} className="fill-primary" />
      <rect x={311} y={214} width={18} height={30} className="fill-primary" />
      <line x1={320} x2={320} y1={244} y2={470} stroke="currentColor" strokeWidth={2} />
      <rect x={312} y={436} width={16} height={30} className="fill-primary" />
      <rect x={400} y={392} width={44} height={20} className="fill-primary" />
      <rect x={232} y={180} width={50} height={5} className="fill-card" stroke="currentColor" />
      {/* mud system */}
      <rect x={470} y={446} width={60} height={24} className="fill-card" stroke="currentColor" />
      <rect x={545} y={452} width={70} height={18} className="fill-card" stroke="currentColor" />
      <path d="M545 460 L530 460 M470 458 L420 458 L420 300 L330 230" fill="none" stroke="currentColor" strokeDasharray="4 3" />
      {/* pipe */}
      <path d="M240 420 L120 462" stroke="currentColor" />
      <rect x={30} y={458} width={90} height={12} className="fill-card" stroke="currentColor" />
      {label(344, 56, "Crown block")}
      {label(334, 202, "Travelling block")}
      {label(334, 232, "Top drive")}
      {label(226, 176, "Racking board", "end")}
      {label(450, 404, "Drawworks")}
      {label(334, 456, "BOP stack")}
      {label(500, 440, "Mud pumps · tanks")}
      {label(80, 452, "Pipe racks", "middle" as "start")}
    </svg>
  );
}
