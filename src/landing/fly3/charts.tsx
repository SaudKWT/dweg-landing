/**
 * The handful of chart forms the detail section needs, drawn as plain SVG on
 * the design system's chart tokens. No chart library: the page carries zero
 * dependencies beyond what its components need.
 *
 * Rules these follow (the dataviz method):
 *   - colour comes from tokens only: --chart-1..3 for identity — KOC blue,
 *     coral, magenta, the design system's jewel tones in their 2026-10-27
 *     order, which its tests hold apart as a SET (every pair, both themes), so
 *     three crossing lines stay distinct for colour-blind readers too. Not
 *     --chart-5 (indigo) beside --chart-1: one colour to a colour-blind reader.
 *     --chart-1 is the one sequential hue, --chart-2 the warm pole where a
 *     scale has a "behind" end;
 *   - thin marks, a 2px surface gap between fills, hairline grid, one y-axis;
 *   - a legend for two or more series, plus direct labels on the few points
 *     that matter — never a number on every point;
 *   - every mark has a hover tooltip, every chart a table view.
 */

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/koc";

/** --chart-1 at a given strength over the card: the sequential ramp, from tokens. */
export const ramp = (pct: number) => `color-mix(in oklab, var(--chart-1) ${pct}%, var(--card))`;
export const C1 = "var(--chart-1)";
export const C2 = "var(--chart-2)";
export const C3 = "var(--chart-3)";
export const NEUTRAL = "color-mix(in oklab, var(--muted-foreground) 35%, var(--card))";

const AXIS = "fill-muted-foreground text-[10px]";
const VALUE = "fill-foreground text-[10px] font-medium";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export interface LegendItem {
  label: string;
  color: string;
  /** A projection, drawn dashed. */
  dashed?: boolean;
}

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

/**
 * A chart's frame: title, legend, the plot with its hover tooltip, and a
 * table view of the same numbers (for screen readers, and for anyone who
 * wants the figures rather than the shape).
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  table,
  height,
  summary,
  children,
  className,
  note,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  table: TableData;
  height: number;
  /** One sentence for the plot's accessible name: what the chart shows. */
  summary: string;
  children: (width: number) => ReactNode;
  className?: string;
  note?: ReactNode;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [asTable, setAsTable] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const t = (e.target as Element).closest("[data-tip]");
    const box = ref.current?.getBoundingClientRect();
    if (!t || !box) return setTip(null);
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, text: t.getAttribute("data-tip") ?? "" });
  };

  return (
    <figure className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card/70 p-4", className)}>
      <figcaption className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <button
          type="button"
          aria-pressed={asTable}
          onClick={() => setAsTable((v) => !v)}
          className="shrink-0 rounded-full border border-input px-2.5 py-0.5 text-2xs text-muted-foreground transition-colors duration-fast ease-out hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Table<span className="sr-only"> view of {title}</span>
        </button>
      </figcaption>

      {legend && legend.length > 1 && !asTable && (
        <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <svg width="16" height="8" className="shrink-0">
                {l.dashed ? (
                  <line x1="0" y1="4" x2="16" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray="3 2" />
                ) : (
                  <rect x="0" y="0" width="16" height="8" rx="2" fill={l.color} />
                )}
              </svg>
              {l.label}
            </li>
          ))}
        </ul>
      )}

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="px-2 py-1.5 font-medium first:pl-0">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  {r.map((v, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="px-2 py-1 pl-0 text-left font-medium">
                        {v}
                      </th>
                    ) : (
                      <td key={j} className="px-2 py-1">
                        {v}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setTip(null)}>
          {w > 0 && (
            <svg role="img" aria-label={`${title}. ${summary} Use the Table button for the figures.`} width={w} height={height} className="block overflow-visible">
              {children(w)}
            </svg>
          )}
          {tip && (
            <div
              role="presentation"
              className="pointer-events-none absolute z-10 whitespace-pre rounded-md border bg-popover px-2 py-1 text-2xs text-popover-foreground shadow-md"
              style={{ left: Math.min(tip.x + 12, w - 160), top: Math.max(0, tip.y - 36) }}
            >
              {tip.text}
            </div>
          )}
        </div>
      )}
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </figure>
  );
}

// ── Scales ─────────────────────────────────────────────────────────────────

const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

function Grid({ ticks, y, x0, x1, fmt }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; fmt: (v: number) => string }) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-muted-foreground/60" : "stroke-border"} strokeWidth={1} />
          <text x={x0 - 6} y={y(t)} dy="0.32em" textAnchor="end" className={AXIS}>
            {fmt(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

// ── 100% stacked columns ───────────────────────────────────────────────────

export interface Segment {
  key: string;
  label: string;
  color: string;
  /** A deep fill: its value is set in the primary-foreground token, not foreground ink. */
  deep?: boolean;
}

/**
 * Columns that each add to 100%, bottom segment first. Segments taller than
 * 16px carry their value; `top` prints a figure above each column (a total, or
 * a share); `line` overlays a share on the same 0–100% axis.
 */
export function StackedColumns({
  w,
  h,
  categories,
  segments,
  data,
  top,
  line,
}: {
  w: number;
  h: number;
  categories: string[];
  segments: Segment[];
  data: number[][];
  top?: { label: string; values: (string | number)[] };
  line?: { label: string; color: string; values: number[]; dashedFrom?: number };
}) {
  const left = 34, right = 4, t = top ? 20 : 6, b = 20;
  const y = lin(0, 100, h - b, t);
  const step = (w - left - right) / categories.length;
  const bw = Math.min(56, step * 0.62);
  const cx = (i: number) => left + step * (i + 0.5);
  return (
    <>
      <Grid ticks={[0, 50, 100]} y={y} x0={left} x1={w - right} fmt={(v) => `${v}%`} />
      {categories.map((c, i) => {
        let acc = 0;
        return (
          <g key={c}>
            {segments.map((s, k) => {
              const v = data[i][k];
              if (!v) return null;
              const y0 = y(acc), y1 = y(acc + v);
              acc += v;
              const hh = y0 - y1 - 2;
              return (
                <g key={s.key} data-tip={`${c} · ${s.label}\n${v}%`}>
                  <rect x={cx(i) - bw / 2} y={y1 + 1} width={bw} height={Math.max(0, hh)} rx={2} fill={s.color} />
                  {hh > 16 && bw > 26 && (
                    <text
                      x={cx(i)}
                      y={(y0 + y1) / 2}
                      dy="0.32em"
                      textAnchor="middle"
                      className={cn("text-[10px] tabular-nums", s.deep ? "fill-primary-foreground" : "fill-foreground")}
                    >
                      {v}%
                    </text>
                  )}
                </g>
              );
            })}
            {top && (
              <text x={cx(i)} y={t - 7} textAnchor="middle" className={cn(VALUE, "tabular-nums")} data-tip={`${c} · ${top.label}\n${top.values[i]}`}>
                {top.values[i]}
              </text>
            )}
            <text x={cx(i)} y={h - 5} textAnchor="middle" className={AXIS}>
              {c}
            </text>
          </g>
        );
      })}
      {line && <LinePath points={line.values.map((v, i) => [cx(i), y(v)])} color={line.color} dashedFrom={line.dashedFrom} halo />}
      {line &&
        line.values.map((v, i) => (
          <circle key={i} cx={cx(i)} cy={y(v)} r={9} fill="transparent" data-tip={`${categories[i]} · ${line.label}\n${v}%`} />
        ))}
    </>
  );
}

// ── Horizontal bars ────────────────────────────────────────────────────────

export function HBars({ w, items, color, fmt }: { w: number; items: { label: string; value: number }[]; color: string; fmt: (v: number) => string }) {
  const left = 92, right = 36, row = 22;
  const x = lin(0, 100, left, w - right);
  return (
    <>
      {items.map((it, i) => (
        <g key={it.label} transform={`translate(0 ${i * row})`} data-tip={`${it.label}\n${fmt(it.value)}`}>
          <rect x={0} y={0} width={w} height={row} fill="transparent" />
          <text x={left - 8} y={row / 2} dy="0.32em" textAnchor="end" className="fill-foreground text-[11px]">
            {it.label}
          </text>
          <rect x={left} y={4} width={Math.max(2, x(it.value) - left)} height={row - 8} rx={2} fill={color} />
          <text x={x(it.value) + 6} y={row / 2} dy="0.32em" className={cn(VALUE, "tabular-nums")}>
            {fmt(it.value)}
          </text>
        </g>
      ))}
    </>
  );
}

// ── Lines ──────────────────────────────────────────────────────────────────

function LinePath({ points, color, dashedFrom, halo }: { points: [number, number][]; color: string; dashedFrom?: number; halo?: boolean }) {
  const d = (ps: [number, number][]) => ps.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const cut = dashedFrom ?? points.length;
  const solid = points.slice(0, cut);
  const dashed = points.slice(Math.max(0, cut - 1));
  return (
    <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {halo && <path d={d(points)} stroke="var(--card)" strokeWidth={5} />}
      {solid.length > 1 && <path d={d(solid)} stroke={color} strokeWidth={2} />}
      {cut < points.length && <path d={d(dashed)} stroke={color} strokeWidth={2} strokeDasharray="5 4" />}
    </g>
  );
}

export interface LineSeries {
  name: string;
  color: string;
  values: (number | null)[];
  /** From this index on the line is a projection, dashed. */
  dashedFrom?: number;
  /** Indices that carry a value label (the end, an extreme). Defaults to the last point. */
  labels?: number[];
}

const lastIndex = (v: (number | null)[]) => v.length - 1 - [...v].reverse().findIndex((n) => n !== null);

/** "NAME value" at each line's end, nudged apart so no two overlap (12px apart at least). */
function EndNames({ items, x, y, fmt }: { items: { s: LineSeries; i: number }[]; x: (i: number) => number; y: (v: number) => number; fmt: (v: number) => string }) {
  const placed = items
    .map(({ s, i }) => ({ s, i, want: y(s.values[i]!) }))
    .sort((a, b) => a.want - b.want);
  let prev = -Infinity;
  for (const p of placed) {
    (p as { at?: number }).at = Math.max(p.want, prev + 12);
    prev = (p as { at?: number }).at!;
  }
  return (
    <g aria-hidden="true">
      {placed.map((p) => (
        <text key={p.s.name} x={x(p.i) + 8} y={(p as { at?: number }).at} dy="0.32em" className="fill-foreground text-[10px]">
          <tspan className="font-medium">{p.s.name}</tspan> <tspan className="tabular-nums">{fmt(p.s.values[p.i]!)}</tspan>
        </text>
      ))}
    </g>
  );
}

export function Lines({
  w,
  h,
  categories,
  series,
  domain,
  ticks,
  fmt,
  rotate,
  endNames,
}: {
  w: number;
  h: number;
  categories: string[];
  series: LineSeries[];
  domain: [number, number];
  ticks: number[];
  fmt: (v: number) => string;
  rotate?: boolean;
  /** Name each series at its end — the direct label that makes the legend optional. */
  endNames?: boolean;
}) {
  const left = 38, right = endNames ? 62 : 14, t = 14, b = rotate ? 34 : 20;
  const y = lin(domain[0], domain[1], h - b, t);
  const step = (w - left - right) / Math.max(1, categories.length - 1);
  const x = (i: number) => left + step * i;
  const showEvery = Math.ceil(categories.length / Math.max(2, Math.floor((w - left - right) / 46)));
  return (
    <>
      <Grid ticks={ticks} y={y} x0={left} x1={w - right} fmt={fmt} />
      {categories.map((c, i) =>
        i % showEvery === 0 || i === categories.length - 1 ? (
          <text
            key={c}
            x={x(i)}
            y={h - b + 14}
            textAnchor={rotate ? "end" : "middle"}
            transform={rotate ? `rotate(-35 ${x(i)} ${h - b + 14})` : undefined}
            className={AXIS}
          >
            {c}
          </text>
        ) : null,
      )}
      {series.map((s) => {
        const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as [number, number]))).filter(Boolean) as [number, number][];
        const last = lastIndex(s.values);
        // With end names, the end carries "NAME value" (placed below, clear of
        // its neighbours), so its plain value label is not drawn twice.
        const lab = (s.labels ?? [last]).filter((i) => !(endNames && i === last));
        return (
          <g key={s.name}>
            <LinePath points={pts} color={s.color} dashedFrom={s.dashedFrom} />
            {s.values.map((v, i) =>
              v === null ? null : (
                <g key={i} data-tip={`${s.name} · ${categories[i]}\n${fmt(v)}${s.dashedFrom !== undefined && i >= s.dashedFrom ? " (to date)" : ""}`}>
                  <circle cx={x(i)} cy={y(v)} r={10} fill="transparent" />
                  {(lab.includes(i) || (endNames && i === last)) && <circle cx={x(i)} cy={y(v)} r={3.5} fill={s.color} stroke="var(--card)" strokeWidth={2} />}
                  {lab.includes(i) && (
                    // The first point's label leans right, clear of the y-axis figures.
                    <text x={i === 0 ? x(i) + 6 : x(i)} y={y(v) - 8} textAnchor={i === 0 ? "start" : "middle"} className={cn(VALUE, "tabular-nums")}>
                      {fmt(v)}
                    </text>
                  )}
                </g>
              ),
            )}
          </g>
        );
      })}
      {endNames && <EndNames items={series.map((s) => ({ s, i: lastIndex(s.values) }))} x={x} y={y} fmt={fmt} />}
    </>
  );
}

// ── Diverging columns (grouped) ────────────────────────────────────────────

/** Groups of columns around zero: one group per asset, one column per period (the ordinal ramp, latest darkest). */
export function DivergingColumns({
  w,
  h,
  groups,
  keys,
  colors,
  data,
  domain,
  ticks,
  fmt,
}: {
  w: number;
  h: number;
  groups: string[];
  keys: string[];
  colors: string[];
  data: number[][];
  domain: [number, number];
  ticks: number[];
  fmt: (v: number) => string;
}) {
  const left = 38, right = 4, t = 10, b = 20;
  const y = lin(domain[0], domain[1], h - b, t);
  const gstep = (w - left - right) / groups.length;
  const bw = Math.max(3, Math.min(14, (gstep * 0.78) / keys.length - 2));
  return (
    <>
      <Grid ticks={ticks} y={y} x0={left} x1={w - right} fmt={fmt} />
      {groups.map((g, gi) => {
        const start = left + gstep * gi + (gstep - keys.length * (bw + 2)) / 2;
        return (
          <g key={g}>
            {keys.map((k, ki) => {
              const v = data[gi][ki];
              const y0 = y(0), y1 = y(v);
              return (
                <rect
                  key={k}
                  data-tip={`${g} · ${k}\n${fmt(v)}`}
                  x={start + ki * (bw + 2)}
                  y={Math.min(y0, y1)}
                  width={bw}
                  height={Math.max(1, Math.abs(y1 - y0))}
                  rx={1.5}
                  fill={colors[ki]}
                />
              );
            })}
            <text x={left + gstep * (gi + 0.5)} y={h - 5} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
              {g}
            </text>
          </g>
        );
      })}
    </>
  );
}

// ── Simple columns around zero ─────────────────────────────────────────────

export function Columns({
  w,
  h,
  categories,
  values,
  color,
  negColor,
  domain,
  ticks,
  fmt,
}: {
  w: number;
  h: number;
  categories: string[];
  values: number[];
  color: string;
  negColor: string;
  domain: [number, number];
  ticks: number[];
  fmt: (v: number) => string;
}) {
  const left = 40, right = 4, t = 18, b = 20;
  const y = lin(domain[0], domain[1], h - b, t);
  const step = (w - left - right) / categories.length;
  const bw = Math.min(64, step * 0.5);
  return (
    <>
      <Grid ticks={ticks} y={y} x0={left} x1={w - right} fmt={fmt} />
      {categories.map((c, i) => {
        const v = values[i];
        const cx = left + step * (i + 0.5);
        const y0 = y(0), y1 = y(v);
        return (
          <g key={c} data-tip={`${c}\n${fmt(v)}`}>
            <rect x={cx - bw / 2} y={Math.min(y0, y1)} width={bw} height={Math.abs(y1 - y0)} rx={2} fill={v < 0 ? negColor : color} />
            <text x={cx} y={v < 0 ? y1 + 12 : y1 - 5} textAnchor="middle" className={cn(VALUE, "tabular-nums")}>
              {fmt(v)}
            </text>
            <text x={cx} y={h - 5} textAnchor="middle" className={AXIS}>
              {c}
            </text>
          </g>
        );
      })}
    </>
  );
}
