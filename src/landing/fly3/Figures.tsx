/**
 * The figures, as F·E·I sets them (fei3/index.tsx, from F v2): rounded cards
 * on the card token — label, a light figure with its unit, the change in its
 * sentiment colour — the KOC headline row first, then the group's eight.
 *
 * Saud, 2026-10-25: the cards should take more of the first screen and the
 * hero less, so here they grow to fill the space the page gives them, each
 * card's trend line taking up the height.
 */

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/koc";

import { COMPANY_KPIS, DATA_AS_OF, GROUP, KPIS, formatKpi, type Kpi } from "../data";
import { SENTIMENT_TEXT, Sparkline, deltaSpeech, formatDelta, kpiSentiment } from "../shared";

export function Figures({ prefix }: { prefix: string }) {
  return (
    <section aria-labelledby={`${prefix}-figures-h`} className="flex min-h-0 shrink-0 flex-col gap-2 px-4 pb-4 pt-3 sm:px-8 lg:min-h-[18.5rem] lg:flex-[2]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={`${prefix}-figures-h`} className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Figures
        </h2>
        <p className="text-2xs text-muted-foreground">
          As of {DATA_AS_OF} · <span className="font-medium text-foreground">placeholder figures</span>
        </p>
      </div>
      <Row label={GROUP.company} kpis={COMPANY_KPIS} cols="grid-cols-2 sm:grid-cols-4" wide />
      <Row label="D&W Engineering Group" kpis={KPIS} cols="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" />
    </section>
  );
}

function Row({ label, kpis, cols, wide }: { label: string; kpis: Kpi[]; cols: string; wide?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <h3 className="text-2xs font-medium text-muted-foreground">{label}</h3>
      <ul className={cn("grid min-h-0 flex-1 gap-2", cols)}>
        {kpis.map((k) => (
          <KpiCard key={k.id} k={k} wide={wide} />
        ))}
      </ul>
    </div>
  );
}

function Delta({ k, wide }: { k: Kpi; wide?: boolean }) {
  const d = formatDelta(k);
  if (!d) return <p className="truncate text-2xs text-muted-foreground">No comparison</p>;
  const s = kpiSentiment(k.delta, k.intent);
  const Icon = k.delta! > 0 ? TrendingUp : k.delta! < 0 ? TrendingDown : Minus;
  return (
    <p className={cn("flex min-w-0 items-center gap-1 text-2xs", SENTIMENT_TEXT[s])}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true" className="shrink-0 font-medium tabular-nums">
        {d}
        {k.deltaFormat === "absolute" && k.unit ? ` ${k.unit}` : ""}
      </span>
      {/* The comparison's wording only where the card is wide enough to say it whole. */}
      {wide && (
        <span aria-hidden="true" className="hidden truncate text-muted-foreground sm:inline">
          {k.deltaLabel}
        </span>
      )}
      <span className="sr-only">{deltaSpeech(k)}</span>
    </p>
  );
}

function KpiCard({ k, wide }: { k: Kpi; wide?: boolean }) {
  return (
    <li
      data-kpi={k.id}
      title={k.description}
      className="relative flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden rounded-lg border bg-card/70 px-3 py-2 backdrop-blur"
    >
      <p className="shrink-0 truncate text-2xs leading-tight text-muted-foreground">{k.label}</p>
      <p className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
        <span className={cn("font-light tabular-nums tracking-tight", wide ? "text-3xl leading-9" : "text-2xl leading-7")}>{formatKpi(k, k.value)}</span>
        {k.unit && <span className="text-2xs text-muted-foreground">{k.unit}</span>}
      </p>
      {/* The trend fills whatever height the card is given; at its smallest it is a hairline row. */}
      <Sparkline values={k.trend} className="h-auto min-h-0 w-full flex-1 text-primary/50" />
      <div className="shrink-0">
        <Delta k={k} wide={wide} />
      </div>
    </li>
  );
}
