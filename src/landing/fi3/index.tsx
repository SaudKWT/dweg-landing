/**
 * v3 "F·I" — Burgan's daily-use page, closed by Exploded View's plate.
 *
 * Saud, 2026-10-22: "F top section and I 3d bottom section." So everything
 * above the footer is F v2 as it stands (find field, card figures, pinned and
 * recent, all 28 links on the first screen), and the footer is I v2's Plate I
 * — the exploded 8½ in PDC bit, its italic callouts and its controls — moved
 * across whole. Both halves are light, clay-and-fog pages, so the plate needs
 * no recolouring; it sits on the same page background as F's top.
 *
 * Copied, not imported: each direction owns only its own folder.
 */

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Minus, Pause, Play, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/koc";

import {
  COMPANY_KPIS,
  DASHBOARD_COUNT,
  DATA_AS_OF,
  GROUP,
  KPIS,
  PLATFORM_LABEL,
  TEAMS,
  formatKpi,
  type DashboardLink,
  type Kpi,
  type Platform,
} from "../data";
import {
  DashboardAnchor,
  PLATFORM_ICON,
  PinToggle,
  SENTIMENT_TEXT,
  Sparkline,
  deltaSpeech,
  formatDelta,
  kpiSentiment,
  matchDashboards,
  useDashboardMemory,
  QuietFind,
  useInView,
  useReducedMotion,
  type RememberedLink,
  type TeamMatch,
} from "../shared";
import { Plate } from "./Plate";

/** Scroll to an in-page target and move focus there. Buttons, never `href="#…"`: the viewer is hash-routed. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.forceReducedMotion === "true";
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

const FOG_BG = {
  background:
    "radial-gradient(70% 45% at 0% 0%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 70%), radial-gradient(60% 50% at 100% 30%, color-mix(in oklab, var(--success) 6%, transparent), transparent 70%), var(--background)",
};

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type Memory = ReturnType<typeof useDashboardMemory>;

export default function DirectionFI3() {
  const memory = useDashboardMemory();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => matchDashboards(query), [query]);
  return (
    <div className="min-h-screen text-foreground" style={FOG_BG}>
      <Header query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-[90rem] px-4 sm:px-8">
        <Figures />
        <YourDashboards memory={memory} />
        <Directory matches={matches} query={query} setQuery={setQuery} memory={memory} />
      </main>
      <PlateFooter />
    </div>
  );
}

// ── Header: identity and the find field ────────────────────────────────────

function Header({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  return (
    <header className="relative mx-auto max-w-[90rem] px-4 pt-4 sm:px-8 sm:pt-5">
      <button
        type="button"
        onClick={() => scrollToId("fi3-directory")}
        className={cn(
          "sr-only rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-2 focus-visible:z-50",
          FOCUS_RING,
        )}
      >
        Skip to dashboards
      </button>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="mr-auto min-w-0">
          <p className="text-2xs font-medium uppercase tracking-caps text-muted-foreground">
            {GROUP.company}
            <span className="hidden md:inline"> · {GROUP.directorate}</span>
          </p>
          <h1 className="mt-0.5 text-base font-medium tracking-tight sm:text-lg">{GROUP.name}</h1>
        </div>
        <QuietFind
          id="fi3-find"
          query={query}
          setQuery={setQuery}
          placeholder="Find a dashboard or team"
          controls="fi3-directory"
          firstResult="#fi3-directory a[href]"
          className="w-full sm:w-[28rem]"
        />
      </div>
      <Horizon />
    </header>
  );
}

/** Burgan's light-streak, at rest: a thin line and its glint under the header. No animation near the controls. */
function Horizon() {
  return (
    <div aria-hidden="true" className="relative mt-3 h-px">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 45%, transparent) 25%, color-mix(in oklab, var(--primary) 45%, transparent) 75%, transparent)",
        }}
      />
      <div
        className="absolute left-[22%] top-1/2 h-[3px] w-24 -translate-y-1/2 rounded-full blur-[2px]"
        style={{ background: "color-mix(in oklab, var(--primary) 70%, transparent)" }}
      />
    </div>
  );
}

// ── Figures: compact, all visible at 1280×630 ──────────────────────────────

function Delta({ k }: { k: Kpi }) {
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
      <span aria-hidden="true" className="hidden truncate text-muted-foreground sm:inline">
        {k.deltaLabel}
      </span>
      <span className="sr-only">{deltaSpeech(k)}</span>
    </p>
  );
}

function KpiCell({ k, wide }: { k: Kpi; wide?: boolean }) {
  return (
    <li data-kpi={k.id} title={k.description} className="relative min-w-0 rounded-lg border bg-card/70 px-3 py-1.5 backdrop-blur sm:py-2">
      <p className="truncate text-2xs text-muted-foreground">{k.label}</p>
      <p className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
        <span className={cn("font-light tabular-nums tracking-tight", wide ? "text-2xl leading-7" : "text-xl leading-6")}>{formatKpi(k, k.value)}</span>
        {k.unit && <span className="text-2xs text-muted-foreground">{k.unit}</span>}
      </p>
      <Delta k={k} />
      {wide && <Sparkline values={k.trend} className="absolute right-3 top-3 hidden h-6 w-16 text-primary/60 sm:block" />}
    </li>
  );
}

function Figures() {
  return (
    <section aria-labelledby="fi3-figures-h" className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="fi3-figures-h" className="text-2xs font-medium uppercase tracking-caps text-muted-foreground">
          Figures
        </h2>
        <p className="text-2xs text-muted-foreground">
          As of {DATA_AS_OF} · <span className="font-medium text-foreground">placeholder figures</span>
        </p>
      </div>
      <div className="mt-2 grid items-center gap-2 lg:grid-cols-[7rem_1fr]">
        <h3 className="text-2xs font-medium leading-snug text-muted-foreground">{GROUP.company}</h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPANY_KPIS.map((k) => (
            <KpiCell key={k.id} k={k} wide />
          ))}
        </ul>
        <h3 className="mt-1 text-2xs font-medium leading-snug text-muted-foreground lg:mt-0">
          D&amp;W Engineering Group
        </h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {KPIS.map((k) => (
            <KpiCell key={k.id} k={k} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Your dashboards: pinned and recent ─────────────────────────────────────

function Chip({ item, memory }: { item: RememberedLink; memory: Memory }) {
  const Icon = PLATFORM_ICON[item.link.platform];
  const pinned = memory.isPinned(item.link.id);
  return (
    <li className="flex min-w-0 max-w-full items-center rounded-full border bg-card/80 backdrop-blur">
      <DashboardAnchor
        link={item.link}
        className={cn("flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2.5 pr-1 text-xs font-medium transition-colors duration-fast ease-out hover:text-primary", FOCUS_RING)}
      >
        <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{item.link.label}</span>
        <span className="shrink-0 font-normal text-muted-foreground">· {item.team.code}</span>
      </DashboardAnchor>
      <PinToggle
        link={item.link}
        pinned={pinned}
        onTogglePin={memory.togglePin}
        className={cn("mr-0.5 rounded-full transition-colors duration-fast ease-out hover:bg-accent", pinned ? "text-primary" : "text-muted-foreground", FOCUS_RING)}
      />
    </li>
  );
}

function MemoryRegion({
  name,
  title,
  items,
  empty,
  memory,
  action,
}: {
  name: string;
  title: string;
  items: RememberedLink[];
  empty: string;
  memory: Memory;
  action?: ReactNode;
}) {
  return (
    <section aria-label={name} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border bg-card/70 backdrop-blur px-3 py-1.5">
      <h2 className="w-full shrink-0 text-2xs sm:w-14 font-medium uppercase tracking-caps text-muted-foreground">{title}</h2>
      {items.length ? (
        <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {items.map((it) => (
            <Chip key={it.link.id} item={it} memory={memory} />
          ))}
        </ul>
      ) : (
        <p className="flex-1 text-xs text-muted-foreground">{empty}</p>
      )}
      {action}
    </section>
  );
}

function YourDashboards({ memory }: { memory: Memory }) {
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <MemoryRegion
        name="Pinned dashboards"
        title="Pinned"
        items={memory.pinned}
        empty="Pin a dashboard with the pin icon to keep it here."
        memory={memory}
      />
      <MemoryRegion
        name="Recent dashboards"
        title="Recent"
        items={memory.recent}
        empty="Dashboards you open will appear here."
        memory={memory}
        action={
          memory.recent.length > 0 && (
            <button
              type="button"
              onClick={memory.clearRecent}
              className={cn("shrink-0 rounded-full px-2 py-1 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground", FOCUS_RING)}
            >
              Clear<span className="sr-only"> recent dashboards</span>
            </button>
          )
        }
      />
    </div>
  );
}

// ── The directory: every team, every link, first screen ────────────────────

function LinkRow({ link, memory }: { link: DashboardLink; memory: Memory }) {
  const Icon = PLATFORM_ICON[link.platform];
  const pinned = memory.isPinned(link.id);
  return (
    <li className="flex items-center gap-0.5 pr-1.5">
      <DashboardAnchor
        link={link}
        className="group flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 pr-1 text-sm transition-colors duration-fast ease-out hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{link.label}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DashboardAnchor>
      <PinToggle
        link={link}
        pinned={pinned}
        onTogglePin={memory.togglePin}
        className={cn("rounded-md transition-colors duration-fast ease-out hover:bg-accent", pinned ? "text-primary" : "text-muted-foreground", FOCUS_RING)}
      />
    </li>
  );
}

const PLATFORMS: Platform[] = ["power-bi", "sharepoint", "web-app"];

function Directory({
  matches,
  query,
  setQuery,
  memory,
}: {
  matches: TeamMatch[];
  query: string;
  setQuery: (q: string) => void;
  memory: Memory;
}) {
  const found = matches.reduce((n, m) => n + m.links.length, 0);
  return (
    <section id="fi3-directory" tabIndex={-1} aria-labelledby="fi3-dir-h" className="mt-5 scroll-mt-4 pb-4 outline-none">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-foreground/15 pb-2">
        <h2 id="fi3-dir-h" className="text-2xs font-medium uppercase tracking-caps text-muted-foreground">
          Dashboards <span className="normal-case tracking-normal">· {TEAMS.length} teams · {DASHBOARD_COUNT}</span>
        </h2>
        {!query && (
          <nav aria-label="Jump to a team" className="-my-1 flex max-w-full gap-0.5 overflow-x-auto">
            {TEAMS.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => scrollToId(`fi3-team-${t.code.toLowerCase()}`)}
                className={cn("shrink-0 rounded-full px-2 py-1 text-2xs font-medium tabular-nums text-muted-foreground hover:bg-accent hover:text-foreground", FOCUS_RING)}
              >
                {t.code}
                <span className="sr-only"> — {t.shortName}</span>
              </button>
            ))}
          </nav>
        )}
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {query && (found ? `${found} ${found === 1 ? "dashboard" : "dashboards"} for “${query}”` : "")}
        </p>
        <ul aria-label="Platforms" className="ml-auto hidden items-center gap-3 text-2xs text-muted-foreground md:flex">
          {PLATFORMS.map((p) => {
            const Icon = PLATFORM_ICON[p];
            return (
              <li key={p} className="flex items-center gap-1">
                <Icon className="size-3.5 text-primary" aria-hidden="true" />
                {PLATFORM_LABEL[p]}
              </li>
            );
          })}
        </ul>
      </div>

      {matches.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No dashboard matches “{query}”.{" "}
          <button type="button" onClick={() => setQuery("")} className={cn("font-medium text-primary underline-offset-4 hover:underline", FOCUS_RING)}>
            Show all {DASHBOARD_COUNT}
          </button>
        </p>
      ) : (
        // Columns, not a grid: teams run 1 to 7 links, and a grid row is as tall as its tallest.
        <ol className="mt-4 gap-x-7 sm:columns-2 lg:columns-3 xl:columns-4">
          {matches.map(({ team: t, links }) => (
            <li
              key={t.code}
              id={`fi3-team-${t.code.toLowerCase()}`}
              tabIndex={-1}
              className="mb-5 break-inside-avoid scroll-mt-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <article aria-labelledby={`fi3-team-${t.code.toLowerCase()}-h`}>
                <div className="flex items-end gap-3">
                  <span aria-hidden="true" className="text-3xl font-extralight leading-none tabular-nums text-primary">
                    {t.index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-caps text-muted-foreground">{t.code}</p>
                    <h3 id={`fi3-team-${t.code.toLowerCase()}-h`} title={t.name} className="truncate text-sm font-medium leading-snug">
                      <span className="sr-only">{t.code} — </span>
                      {t.shortName}
                      {t.abbr && <span className="font-normal text-muted-foreground"> · {t.abbr}</span>}
                    </h3>
                  </div>
                </div>
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border bg-card/70 backdrop-blur">
                  {links.map((l) => (
                    <LinkRow key={l.id} link={l} memory={memory} />
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ── Footer: Plate I, from Exploded View ────────────────────────────────────

const WORDMARK = [
  { text: "Drilling &", indent: "" },
  { text: "Workover", indent: "pl-[1.55em]" },
  { text: "Engineering", indent: "" },
  { text: "— Group", indent: "pl-[2.3em]" },
];

function PlateFooter() {
  const reduced = useReducedMotion();
  const [exploded, setExploded] = useState<boolean | null>(null);
  const [paused, setPaused] = useState(false);
  const [drawing, setDrawing] = useState(false);
  // The renderer mounts as the footer approaches, not at page load: the
  // directory above is what people come for, and it must not wait on WebGL.
  const [ref, near] = useInView<HTMLElement>("800px 0px 800px 0px");

  return (
    <footer
      ref={ref}
      className={cn(
        "relative mt-12 overflow-hidden border-t border-foreground/10",
        "bg-[radial-gradient(110%_90%_at_72%_45%,color-mix(in_oklab,var(--primary)_10%,var(--background))_0%,var(--background)_70%)]",
      )}
    >
      <div className="relative mx-auto flex min-h-[36rem] max-w-[90rem] flex-col px-4 pb-20 pt-10 sm:px-8 lg:h-[min(100svh,52rem)]">
        <div className="relative z-10 lg:max-w-[38%]">
          <p className="font-mono text-xs text-muted-foreground">
            02 <span aria-hidden="true">—</span> Plate I
          </p>
          {/* The group's name at INFRA's scale — decorative here; the h1 is above. */}
          <p
            aria-hidden="true"
            className="mt-4 text-[clamp(2.5rem,5vw,5.75rem)] font-medium uppercase leading-[0.86] tracking-[-0.04em] text-primary"
          >
            {WORDMARK.map((l) => (
              <span key={l.text} className={cn("block", l.indent)}>
                {l.text}
              </span>
            ))}
          </p>
          <p className="mt-6 max-w-sm font-serif text-sm italic leading-snug text-muted-foreground">
            {drawing
              ? "Fig. 1 — An 8½ in PDC drill bit in elevation: 16 mm cutters on the profile, API 4½ in REG pin. Drawn flat because this device has no hardware 3D."
              : "Fig. 1 — An 8½ in PDC drill bit: six blades, 16 mm cutters, API 4½ in REG pin. Modelled in code and exploded along its axis."}
          </p>
          <div role="group" aria-label="Plate controls" className="mt-4 flex items-center gap-1" hidden={drawing}>
            {(
              [
                [false, "Assembled"],
                [true, "Exploded"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={exploded === v}
                onClick={() => setExploded(v)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast ease-out",
                  FOCUS_RING,
                  exploded === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
            {!reduced && (
              <button
                type="button"
                aria-pressed={paused}
                aria-label="Pause the animation"
                onClick={() => setPaused(!paused)}
                className={cn(
                  "ml-1 inline-flex size-7 items-center justify-center rounded-full border border-input bg-background transition-colors duration-fast ease-out hover:bg-accent",
                  FOCUS_RING,
                )}
              >
                {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

        {/* Below the text on narrow screens; the right 58% on desktop. Nothing
            functional ever sits on it. */}
        <div className="relative -mx-4 mt-6 h-[min(122vw,40rem)] sm:-mx-8 lg:absolute lg:inset-y-0 lg:left-[42%] lg:right-0 lg:m-0 lg:h-auto">
          {near && (
            <Plate exploded={exploded} paused={paused} reduced={reduced} onFallback={() => setDrawing(true)} />
          )}
        </div>

        <div className="relative z-10 mt-6 flex flex-col gap-1 text-xs text-muted-foreground lg:mt-auto lg:max-w-[38%]">
          <p className="font-medium text-foreground">
            {GROUP.company} · {GROUP.name}
          </p>
          <p>
            Evaluation build. Every dashboard name, link and figure on this page is a placeholder. Figures as of {DATA_AS_OF}.
          </p>
        </div>
      </div>
    </footer>
  );
}
