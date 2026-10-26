/**
 * Below the first screen: the detail behind the highlights. The landing shows
 * the twelve figures; scrolling down opens each into what stands behind it —
 * the figures in full, then drilling performance against benchmarks, drilling
 * rate improvement, rig moves, workover rate improvement and water shut-off.
 *
 * Every number in insights-data.ts is invented (Saud, 2026-10-25). Static SVG
 * only: nothing here moves, so nothing here needs a reduced-motion path.
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/koc";

import { COMPANY_KPIS, DATA_AS_OF, GROUP, KPIS, formatKpi, type Kpi } from "../data";
import { SENTIMENT_TEXT, Sparkline, deltaSpeech, formatDelta, kpiSentiment } from "../shared";
import { C1, C2, C4, ChartFrame, Columns, DivergingColumns, HBars, Lines, NEUTRAL, StackedColumns, ramp, type Segment } from "./charts";
import {
  ASSETS,
  ASSET_NAME,
  BANDS,
  CONTRACTORS,
  DRI_BY_ASSET,
  DRI_KOC,
  FY12,
  LEARNING,
  LOST_DAYS,
  QUARTERS,
  RIG_MOVES,
  TIME_SPLIT,
  TOP_CATEGORIES,
  WELLS_BY_ASSET,
  WELLS_BY_YEAR,
  WORKOVER_JOBS,
  WRI,
  WSO,
  YTD_FROM,
} from "./insights-data";

const pct = (v: number) => `${v}%`;
const spct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`;
const spct1 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

/** The benchmark bands, bottom first: a warm "behind" pole, then one blue deepening with performance. */
const BAND_SEGMENTS: Segment[] = BANDS.map((b, i) => ({ ...b, color: [C2, ramp(30), ramp(62), C1, NEUTRAL][i], deep: i === 0 || i === 3 }));

export function Insights({ prefix }: { prefix: string }) {
  return (
    <div className="flex flex-col gap-16 px-4 pb-28 pt-14 sm:px-8">
      <FiguresInDetail prefix={prefix} />
      <Drilling prefix={prefix} />
      <RateImprovement prefix={prefix} />
      <RigMoves prefix={prefix} />
      <Workover prefix={prefix} />
      <WaterShutOff prefix={prefix} />
      <p className="max-w-3xl text-xs text-muted-foreground">
        Every figure on this page is a placeholder, invented for the design. Contractors are lettered for the same reason.
        Hover a chart for its values, or open its table.
      </p>
    </div>
  );
}

function Section({ prefix, n, eyebrow, title, aside, children }: { prefix: string; n: string; eyebrow: string; title: string; aside?: ReactNode; children: ReactNode }) {
  const id = `${prefix}-detail-${n}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="font-mono text-primary">{n}</span> — {eyebrow}
          </p>
          <h2 id={id} className="mt-2 text-3xl font-light tracking-tight sm:text-4xl">
            {title}
          </h2>
        </div>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

// ── 02 · The figures in full ───────────────────────────────────────────────

function Change({ k }: { k: Kpi }) {
  const d = formatDelta(k);
  if (!d) return <p className="text-xs text-muted-foreground">No comparison</p>;
  const s = kpiSentiment(k.delta, k.intent);
  const Icon = k.delta! > 0 ? TrendingUp : k.delta! < 0 ? TrendingDown : Minus;
  return (
    <p className="flex items-center gap-1.5 text-xs">
      <Icon className={cn("size-3.5 shrink-0", SENTIMENT_TEXT[s])} aria-hidden="true" />
      <span aria-hidden="true" className={cn("font-medium tabular-nums", SENTIMENT_TEXT[s])}>
        {d}
        {k.deltaFormat === "absolute" && k.unit ? ` ${k.unit}` : ""}
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        {k.deltaLabel}
      </span>
      <span className="sr-only">{deltaSpeech(k)}</span>
    </p>
  );
}

function FiguresInDetail({ prefix }: { prefix: string }) {
  return (
    <Section prefix={prefix} n="02" eyebrow="Figures" title={GROUP.company} aside={<>As of {DATA_AS_OF} · <span className="font-medium text-foreground">placeholder figures</span></>}>
      <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        {COMPANY_KPIS.map((k) => (
          <li key={k.id} className="flex flex-col gap-1 border-t pt-4">
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{k.tag}</p>
            <h3 className="text-sm">{k.label}</h3>
            <p className="mt-1 flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-5xl font-light tabular-nums tracking-tight">{formatKpi(k, k.value)}</span>
              {k.unit && <span className="text-sm text-muted-foreground">{k.unit}</span>}
            </p>
            <Change k={k} />
            <Sparkline values={k.trend} className="mt-3 h-12 text-primary/70" />
            <p className="mt-1 text-xs text-muted-foreground">{k.description}</p>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-2xl font-light tracking-tight">
        {GROUP.name} <span className="text-muted-foreground">· {GROUP.abbr}</span>
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <li key={k.id} className="flex flex-col gap-1 rounded-xl border bg-card/70 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-sm">{k.label}</h4>
              <span className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{k.tag}</span>
            </div>
            <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-3xl font-light tabular-nums tracking-tight">{formatKpi(k, k.value)}</span>
              {k.unit && <span className="text-sm text-muted-foreground">{k.unit}</span>}
            </p>
            <Change k={k} />
            <Sparkline values={k.trend} className="mt-2 h-9 text-primary/70" />
            <p className="mt-1 text-xs text-muted-foreground">{k.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── 03 · Drilling performance ──────────────────────────────────────────────

function Drilling({ prefix }: { prefix: string }) {
  const assetRows = ASSETS.map((a) => WELLS_BY_ASSET[a]);
  return (
    <Section prefix={prefix} n="03" eyebrow="Drilling performance" title="Wells against their benchmarks" aside="Financial year 2025–26">
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <ChartFrame
          title="Well performance by asset"
          subtitle="Share of wells in each benchmark band · above each column, wells with room to improve"
          summary="Heavy Oil has the most wells ahead of the top quartile; West Kuwait the most behind the median."
          legend={BAND_SEGMENTS.map((s) => ({ label: s.label, color: s.color }))}
          height={260}
          table={{ columns: ["Asset", ...BANDS.map((b) => b.label)], rows: ASSETS.map((a) => [a, ...WELLS_BY_ASSET[a].map(pct)]) }}
        >
          {(w) => (
            <StackedColumns
              w={w}
              h={260}
              categories={[...ASSETS]}
              segments={BAND_SEGMENTS}
              data={assetRows}
              top={{ label: "Improvement opportunity", values: assetRows.map((r) => `${r[0] + r[1]}%`) }}
            />
          )}
        </ChartFrame>

        <ChartFrame
          title="Contractor performance"
          subtitle="Share of each contractor's wells in the top categories"
          summary="Two contractors put nine in ten wells in the top categories; the lowest puts three in ten."
          height={CONTRACTORS.length * 22}
          table={{ columns: ["Contractor", "Wells in top categories"], rows: CONTRACTORS.map((c) => [c.label, pct(c.value)]) }}
        >
          {(w) => <HBars w={w} items={CONTRACTORS} color={C1} fmt={pct} />}
        </ChartFrame>

        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2 2xl:col-span-1 2xl:grid-cols-1">
          <ChartFrame
            title="Learning curve"
            subtitle="Median dry-hole days per 1,000 ft, by asset"
            summary="All three assets drill faster than five years ago; West Kuwait recovered most after 2019–20."
            legend={[
              { label: "NK", color: C1 },
              { label: "SEK", color: C2 },
              { label: "WK", color: C4 },
            ]}
            height={170}
            table={{ columns: ["Year", "NK", "SEK", "WK"], rows: LEARNING.years.map((y, i) => [y, LEARNING.NK[i], LEARNING.SEK[i], LEARNING.WK[i]]) }}
          >
            {(w) => (
              <Lines
                w={w}
                h={170}
                categories={LEARNING.years}
                series={[
                  { name: "NK", color: C1, values: LEARNING.NK, labels: [] },
                  { name: "SEK", color: C2, values: LEARNING.SEK, labels: [] },
                  { name: "WK", color: C4, values: LEARNING.WK, labels: [4] },
                ]}
                domain={[1.5, 5]}
                ticks={[2, 3, 4, 5]}
                fmt={(v) => v.toFixed(1)}
                endNames
              />
            )}
          </ChartFrame>
          <ChartFrame
            title="Drilling time"
            subtitle="Productive and non-productive time, share of rig days"
            summary="Deep drilling loses 29% of rig days to non-productive time; development drilling 15%."
            legend={[
              { label: "Productive", color: C1 },
              { label: "Non-productive", color: C2 },
            ]}
            height={170}
            table={{ columns: ["Programme", "Productive", "Non-productive"], rows: TIME_SPLIT.map((t) => [t.label, pct(t.productive), pct(t.npt)]) }}
          >
            {(w) => (
              <StackedColumns
                w={w}
                h={170}
                categories={TIME_SPLIT.map((t) => t.label)}
                segments={[
                  { key: "p", label: "Productive", color: C1, deep: true },
                  { key: "n", label: "Non-productive", color: C2, deep: true },
                ]}
                data={TIME_SPLIT.map((t) => [t.productive, t.npt])}
              />
            )}
          </ChartFrame>
        </div>

        <ChartFrame
          className="lg:col-span-2 2xl:col-span-3"
          title="Twelve years of wells"
          subtitle="Wells drilled each year (above), the share in each benchmark band, and the share in the top categories (line)"
          summary="The share of wells in the top categories rose from about a sixth in 2015–16 to more than three quarters this year."
          legend={[...BAND_SEGMENTS.map((s) => ({ label: s.label, color: s.color })), { label: "Top categories", color: "var(--foreground)" }]}
          height={300}
          table={{
            columns: ["Year", "Wells", ...BANDS.map((b) => b.label), "Top categories"],
            rows: FY12.map((y, i) => [y, WELLS_BY_YEAR.total[i], ...WELLS_BY_YEAR.bands[i].map(pct), pct(TOP_CATEGORIES[i])]),
          }}
          note={<>2026–27 runs April to September so far.</>}
        >
          {(w) => (
            <StackedColumns
              w={w}
              h={300}
              categories={FY12}
              segments={BAND_SEGMENTS}
              data={WELLS_BY_YEAR.bands}
              top={{ label: "Wells drilled", values: WELLS_BY_YEAR.total }}
              line={{ label: "Top categories", color: "var(--foreground)", values: TOP_CATEGORIES, dashedFrom: YTD_FROM }}
            />
          )}
        </ChartFrame>
      </div>
    </Section>
  );
}

// ── 04 · Drilling rate improvement ─────────────────────────────────────────

function RateImprovement({ prefix }: { prefix: string }) {
  return (
    <Section prefix={prefix} n="04" eyebrow="Drilling rate improvement" title="Faster than the standard, for four years" aside="Positive is faster than the standard · 2026–27 is a year to date">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ChartFrame
          title="KOC drilling rate improvement"
          subtitle="Twelve years · rig days saved against the standard"
          summary="DRI turned positive in 2022–23 and has risen every year since, to +24% so far in 2026–27."
          legend={[
            { label: "DRI", color: C1 },
            { label: "Year to date", color: C1, dashed: true },
          ]}
          height={260}
          table={{ columns: ["Year", "DRI"], rows: FY12.map((y, i) => [y, spct(DRI_KOC[i])]) }}
        >
          {(w) => (
            <Lines
              w={w}
              h={260}
              categories={FY12}
              series={[{ name: "KOC", color: C1, values: DRI_KOC, dashedFrom: YTD_FROM, labels: [0, 5, 7, 10, 11] }]}
              domain={[-15, 30]}
              ticks={[-10, 0, 10, 20, 30]}
              fmt={spct}
            />
          )}
        </ChartFrame>
        <ChartFrame
          title="Stuck pipe and mud losses"
          subtitle="Rig days lost per year"
          summary="Days lost to both fell by about two fifths between 2024–25 and 2025–26."
          legend={[
            { label: "Mud losses", color: C2 },
            { label: "Stuck pipe", color: C1 },
          ]}
          height={260}
          table={{ columns: ["Year", "Stuck pipe", "Mud losses"], rows: LOST_DAYS.years.map((y, i) => [y, LOST_DAYS.stuck[i], LOST_DAYS.mud[i]]) }}
          note={<>2024–25 to 2025–26: stuck pipe −36%, mud losses −39%.</>}
        >
          {(w) => (
            <Lines
              w={w}
              h={260}
              categories={LOST_DAYS.years}
              series={[
                { name: "Mud", color: C2, values: LOST_DAYS.mud, labels: [0, 1, 2] },
                { name: "Stuck", color: C1, values: LOST_DAYS.stuck, labels: [0, 1, 2] },
              ]}
              domain={[0, 700]}
              ticks={[0, 200, 400, 600]}
              fmt={(v) => String(v)}
              endNames
            />
          )}
        </ChartFrame>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ASSETS.map((a) => (
          <li key={a} className="contents">
            <ChartFrame
              title={a}
              subtitle={ASSET_NAME[a]}
              summary={`${ASSET_NAME[a]}: ${spct(DRI_BY_ASSET[a][YTD_FROM])} so far in 2026–27.`}
              height={150}
              table={{ columns: ["Year", "DRI"], rows: FY12.map((y, i) => [y, spct(DRI_BY_ASSET[a][i])]) }}
            >
              {(w) => (
                <Lines
                  w={w}
                  h={150}
                  categories={FY12}
                  series={[{ name: a, color: C1, values: DRI_BY_ASSET[a], dashedFrom: YTD_FROM, labels: [YTD_FROM] }]}
                  domain={[-30, 45]}
                  ticks={[-25, 0, 25]}
                  fmt={spct}
                  rotate
                />
              )}
            </ChartFrame>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ── 05 · Rig moves ─────────────────────────────────────────────────────────

function RigMoves({ prefix }: { prefix: string }) {
  const m = RIG_MOVES;
  return (
    <Section prefix={prefix} n="05" eyebrow="Rig moves · development drilling" title="More moves, done faster">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        <figure className="flex flex-col gap-3 rounded-xl border bg-card/70 p-4">
          <figcaption className="text-sm font-medium">Moves and average move time</figcaption>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1.5 font-medium">Year</th>
                <th scope="col" className="py-1.5 text-right font-medium">Moves</th>
                <th scope="col" className="py-1.5 text-right font-medium">Average move</th>
              </tr>
            </thead>
            <tbody>
              {m.years.map((y, i) => (
                <tr key={y} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="py-2 text-left font-medium">{y}</th>
                  <td className="py-2 text-right">{m.moves[i]}</td>
                  <td className="py-2 text-right">{m.avgDays[i].toFixed(1)} d</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Moves more than doubled, from {m.moves[0]} to {m.moves[2]}, while the average move fell from {m.avgDays[0]} to {m.avgDays[2]} days.
          </p>
        </figure>
        <ChartFrame
          title="Moves within contractual time"
          subtitle="Share of moves, per year"
          summary={`Compliance rose ${m.compliance[2] - m.compliance[0]} percentage points in two years.`}
          height={200}
          table={{ columns: ["Year", "Within contractual time"], rows: m.years.map((y, i) => [y, pct(m.compliance[i])]) }}
        >
          {(w) => (
            <Lines w={w} h={200} categories={m.years} series={[{ name: "Compliance", color: C1, values: m.compliance, labels: [0, 1, 2] }]} domain={[50, 100]} ticks={[50, 75, 100]} fmt={pct} />
          )}
        </ChartFrame>
        <ChartFrame
          title="Days against contractual time"
          subtitle="Rig days ahead (saved) or behind (lost), summed"
          summary={`From ${Math.abs(m.daysAhead[0])} days lost in 2023–24 to ${m.daysAhead[2]} days saved in 2025–26.`}
          legend={[
            { label: "Saved", color: C1 },
            { label: "Lost", color: C2 },
          ]}
          height={200}
          table={{ columns: ["Year", "Days ahead (+) or behind (−)"], rows: m.years.map((y, i) => [y, m.daysAhead[i]]) }}
        >
          {(w) => (
            <Columns
              w={w}
              h={200}
              categories={m.years}
              values={m.daysAhead}
              color={C1}
              negColor={C2}
              domain={[-300, 800]}
              ticks={[-200, 0, 200, 400, 600, 800]}
              fmt={(v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`}
            />
          )}
        </ChartFrame>
      </div>
    </Section>
  );
}

// ── 06 · Workover ──────────────────────────────────────────────────────────

const QUARTER_COLORS = [22, 36, 50, 64, 82, 100].map(ramp);

function Workover({ prefix }: { prefix: string }) {
  const j = WORKOVER_JOBS;
  const share = (j.within / j.total) * 100;
  const rows = [...ASSETS, "KOC"] as const;
  return (
    <Section prefix={prefix} n="06" eyebrow="Workover rate improvement" title="Workovers against the standard">
      <p className="max-w-3xl text-sm text-muted-foreground">
        WRI compares each workover's duration with the standard for its asset and objective, drawn from past jobs. Positive
        means faster than the standard.
      </p>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ChartFrame
          title="WRI by asset, quarter by quarter"
          subtitle="Six quarters · the latest is darkest"
          summary="Every asset was faster than the standard in Q1 2026–27; Gas then fell sharply in Q2."
          legend={QUARTERS.map((q, i) => ({ label: q, color: QUARTER_COLORS[i] }))}
          height={260}
          table={{ columns: ["Asset", ...QUARTERS], rows: rows.map((a) => [a, ...WRI[a].map(spct1)]) }}
        >
          {(w) => (
            <DivergingColumns
              w={w}
              h={260}
              groups={[...rows]}
              keys={QUARTERS}
              colors={QUARTER_COLORS}
              data={rows.map((a) => WRI[a])}
              domain={[-25, 15]}
              ticks={[-20, -10, 0, 10]}
              fmt={spct1}
            />
          )}
        </ChartFrame>
        <figure className="flex flex-col gap-3 rounded-xl border bg-card/70 p-4">
          <figcaption>
            <span className="block text-sm font-medium">Jobs against standard duration</span>
            <span className="block text-xs text-muted-foreground">April to September 2026 · {j.total} jobs</span>
          </figcaption>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-light tabular-nums tracking-tight">{share.toFixed(1)}%</span>
            <span className="text-sm text-muted-foreground">within standard</span>
          </p>
          <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            <span style={{ width: `${share}%`, background: C1 }} />
            <span className="flex-1" style={{ background: C2 }} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="border-l-2 pl-3" style={{ borderColor: C1 }}>
              <dt className="text-xs text-muted-foreground">Within standard</dt>
              <dd className="text-2xl font-light tabular-nums">{j.within}</dd>
              <dd className="text-2xs text-muted-foreground">Q1 {j.q1[0]} · Q2 {j.q2[0]}</dd>
            </div>
            <div className="border-l-2 pl-3" style={{ borderColor: C2 }}>
              <dt className="text-xs text-muted-foreground">Behind standard</dt>
              <dd className="text-2xl font-light tabular-nums">{j.total - j.within}</dd>
              <dd className="text-2xs text-muted-foreground">Q1 {j.q1[1]} · Q2 {j.q2[1]}</dd>
            </div>
          </dl>
        </figure>
      </div>
    </Section>
  );
}

// ── 07 · Water shut-off ────────────────────────────────────────────────────

function WaterShutOff({ prefix }: { prefix: string }) {
  return (
    <Section prefix={prefix} n="07" eyebrow="Water shut-off" title="Success on the first or second attempt" aside="Share of jobs · six quarters">
      <div className="grid gap-4 lg:grid-cols-3">
        {WSO.map((a) => (
          <ChartFrame
            key={a.area}
            title={a.area}
            subtitle={`${a.jobs.reduce((s, v) => s + v, 0)} jobs`}
            summary={`${a.area}: ${a.first[5]}% succeeded first time and ${a.second[5]}% within two attempts in Q2 2026–27.`}
            legend={[
              { label: "Within two attempts", color: C2 },
              { label: "First attempt", color: C1 },
            ]}
            height={190}
            table={{ columns: ["Quarter", "First attempt", "Within two", "Jobs"], rows: QUARTERS.map((q, i) => [q, pct(a.first[i]), pct(a.second[i]), a.jobs[i]]) }}
          >
            {(w) => (
              <Lines
                w={w}
                h={190}
                categories={QUARTERS.map((q) => q.replace(" ", " "))}
                series={[
                  { name: "Two", color: C2, values: [...a.second], labels: [0, 5] },
                  { name: "First", color: C1, values: [...a.first], labels: [0, 5] },
                ]}
                domain={[40, 100]}
                ticks={[50, 75, 100]}
                fmt={pct}
                rotate
              />
            )}
          </ChartFrame>
        ))}
      </div>
    </Section>
  );
}
