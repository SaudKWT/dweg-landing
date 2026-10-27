/**
 * v3 "F·E·I" — Burgan's daily-use page, under Exploded View's masthead, closed
 * by Wellpath's whole tour drawn in Exploded View's style.
 *
 * Saud, 2026-10-22: style the rig "with the styling from the I section in the
 * drill bit", with I's title beside it; then "instead of the circular bases,
 * make a scene that fades into infinity … don't make it exploded view … bring
 * the whole well plan from the original drilling rig"; and "a title similar to
 * [I's masthead] but change the logo to the KOC logo".
 *
 *   masthead   I's staggered blue title and the KOC logo, F's find field
 *   figures    F v2's card figures, pinned and recent, all 28 links
 *   footer     E's tour (rig, well plan, casing, build, BHA, bit) in I's clay
 *              and blueprint lines, its ground grid running to the horizon
 *
 * Copied, not imported: each direction owns only its own folder.
 */

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

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
  type RememberedLink,
  type TeamMatch,
} from "../shared";
import emblem from "./koc-emblem.svg";
import { WellStage } from "./Stage";

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

export default function DirectionFEI3() {
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
      <PageFooter />
    </div>
  );
}

// ── Header: identity and the find field ────────────────────────────────────

function Header({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  return (
    <header className="relative mx-auto max-w-[90rem] px-4 pt-4 sm:px-8 sm:pt-5">
      <button
        type="button"
        onClick={() => scrollToId("fei3-directory")}
        className={cn(
          "sr-only rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-2 focus-visible:z-50",
          FOCUS_RING,
        )}
      >
        Skip to dashboards
      </button>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {/* I's masthead, with the KOC logo where I stands its bit mark. */}
        <div className="mr-auto flex min-w-0 items-center gap-3">
          {/* The KOC emblem alone (the wordmark lines under it are cut away in
              koc-emblem.svg), as tall as the title block. The artwork is white,
              made for a blue tile; a mask draws it in KOC blue, like I's mark. */}
          <span
            aria-hidden="true"
            className="h-[4.5rem] w-[3.65rem] shrink-0 bg-primary"
            style={{ mask: `url(${emblem}) center / contain no-repeat`, WebkitMask: `url(${emblem}) center / contain no-repeat` }}
          />
          <div className="min-w-0">
            <h1 className="text-[clamp(1.25rem,1.9vw,1.75rem)] font-medium uppercase leading-[0.9] tracking-[-0.035em] text-primary">
              <span className="block">Drilling &amp; Workover</span>
              <span className="block pl-[1.2em]">
                Engineering <span aria-hidden="true">—</span> Group
              </span>
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{GROUP.abbr}</span> · {GROUP.company}
              <span className="hidden sm:inline"> · {GROUP.directorate}</span>
            </p>
          </div>
        </div>
        <QuietFind
          id="fei3-find"
          query={query}
          setQuery={setQuery}
          placeholder="Find a dashboard or team"
          controls="fei3-directory"
          firstResult="#fei3-directory a[href]"
          className="w-full sm:w-[28rem]"
        />
      </div>
      <Horizon />
    </header>
  );
}

/** Burgan's horizon line under the header, without its glint (Saud: remove the glow). */
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
    <section aria-labelledby="fei3-figures-h" className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="fei3-figures-h" className="text-2xs font-medium uppercase tracking-caps text-muted-foreground">
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
    <section id="fei3-directory" tabIndex={-1} aria-labelledby="fei3-dir-h" className="mt-5 scroll-mt-4 pb-4 outline-none">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-foreground/15 pb-2">
        <h2 id="fei3-dir-h" className="text-2xs font-medium uppercase tracking-caps text-muted-foreground">
          Dashboards <span className="normal-case tracking-normal">· {TEAMS.length} teams · {DASHBOARD_COUNT}</span>
        </h2>
        {!query && (
          <nav aria-label="Jump to a team" className="-my-1 flex max-w-full gap-0.5 overflow-x-auto">
            {TEAMS.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => scrollToId(`fei3-team-${t.code.toLowerCase()}`)}
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
              id={`fei3-team-${t.code.toLowerCase()}`}
              tabIndex={-1}
              className="mb-5 break-inside-avoid scroll-mt-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <article aria-labelledby={`fei3-team-${t.code.toLowerCase()}-h`}>
                <div className="flex items-end gap-3">
                  <span aria-hidden="true" className="text-3xl font-extralight leading-none tabular-nums text-primary">
                    {t.index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-caps text-muted-foreground">{t.code}</p>
                    <h3 id={`fei3-team-${t.code.toLowerCase()}-h`} title={t.name} className="truncate text-sm font-medium leading-snug">
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

// ── Footer: the well, from rig floor to bit ─────────────────────────────────

function PageFooter() {
  return (
    <footer className="mt-12 border-t border-foreground/10">
      <WellStage id="fei3-tour" />
    </footer>
  );
}
