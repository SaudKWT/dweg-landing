/**
 * The directory as an app sidebar: each team is a menu item, its dashboards
 * nested under it, the way @koc/sidebar nests a sub-menu.
 *
 * Ported from the design system's sidebar (KOC Design System,
 * packages/ui/src/components/sidebar.tsx), not installed: the classes below are
 * its SidebarHeader / SidebarInput / SidebarGroupLabel / SidebarMenuButton /
 * SidebarMenuSub / SidebarMenuSubButton / SidebarMenuAction, on the same
 * --sidebar-* tokens. Installing the item would pull its sheet, tooltip and
 * collapsible primitives for a sidebar that never collapses to a rail here.
 *
 * Every team starts folded (Saud, 2026-10-25: "make the links in the sidebar
 * compacted by default"), so the eight teams fit without scrolling; a search
 * unfolds every team that matches, and pinned and recent stay one click away.
 *
 * Find follows the design system's app shell (2026-10-26): a quiet row with a
 * card's hairline at rest, the bordered input only while it is being typed in.
 * Recent stays — the landing page is the one place it belongs (Saud, 2026-10-25).
 */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BookOpen, ChevronRight, Search, X } from "lucide-react";

import { cn } from "@/koc";

import emblem from "./koc-emblem.svg";

import { GROUP, type DashboardLink } from "../data";
import {
  DashboardAnchor,
  PLATFORM_ICON,
  PinToggle,
  useDashboardMemory,
  type RememberedLink,
  type TeamMatch,
} from "../shared";

type Memory = ReturnType<typeof useDashboardMemory>;

/** SidebarMenuButton, default size. */
const MENU_BUTTON =
  "peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium ring-sidebar-ring outline-hidden transition-[background-color,color] duration-fast ease-out hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0";
/** SidebarMenuSubButton, md. */
const SUB_BUTTON =
  "flex h-7 min-w-0 flex-1 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 pr-7 text-sm text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>span:first-of-type]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground/60";
/** SidebarMenuAction with showOnHover: hidden until the row is hovered or focused, always shown when pinned. */
const MENU_ACTION =
  "absolute top-0.5 right-1 rounded-md text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-focus-within/menu-sub-item:opacity-100 group-hover/menu-sub-item:opacity-100 aria-pressed:text-sidebar-foreground aria-pressed:opacity-100 md:opacity-0";
/** SidebarGroupLabel. */
const GROUP_LABEL = "flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70";

export function Sidebar({
  prefix,
  query,
  setQuery,
  matches,
  memory,
}: {
  /** The direction's id prefix, so two pages' DOM ids never collide. */
  prefix: string;
  query: string;
  setQuery: (q: string) => void;
  matches: TeamMatch[];
  memory: Memory;
}) {
  const field = useRef<HTMLInputElement>(null);
  const rest = useRef<HTMLButtonElement>(null);
  // Whether Find is open as an input. A query keeps it open, so a search in
  // progress never collapses back into the quiet row.
  const [finding, setFinding] = useState(false);
  const open = finding || !!query;
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const found = matches.reduce((n, m) => n + m.links.length, 0);

  // Ctrl K / Cmd K opens Find from anywhere. `code` first, so it works on an
  // Arabic layout, where the K key does not type "k"; the input focuses itself
  // on mount, and is selected when it was already open.
  useEffect(() => {
    const onShortcut = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (e.code !== "KeyK" && e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      setFinding(true);
      field.current?.focus();
      field.current?.select();
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const toRest = () => {
    setFinding(false);
    requestAnimationFrame(() => rest.current?.focus());
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // First Esc clears; the second puts Find back to rest.
      if (query) setQuery("");
      else toRest();
    } else if (e.key === "Enter" || e.key === "ArrowDown") {
      const first = document.querySelector<HTMLAnchorElement>(`#${prefix}-teams a[href]`);
      if (first) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <aside
      aria-label="Dashboards"
      className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-svh lg:w-72 lg:border-r lg:border-b-0"
    >
      {/* SidebarHeader: the brand row, as a lg menu button holds it. */}
      <div className="flex flex-col gap-2 p-2">
        <div className="flex h-14 items-center gap-2.5 px-1">
          {/* The KOC emblem alone, in KOC blue with no tile: the wordmark lines
              under it are cut away in koc-emblem.svg. The artwork is white (made
              for a blue tile), so a mask draws it in --primary. */}
          <span
            aria-hidden="true"
            className="h-11 w-9 shrink-0 bg-primary"
            style={{ mask: `url(${emblem}) center / contain no-repeat`, WebkitMask: `url(${emblem}) center / contain no-repeat` }}
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold">{GROUP.abbr}</span>
            <span className="block truncate text-xs text-sidebar-foreground/70">{GROUP.company}</span>
          </span>
        </div>
        {/*
         * Find, as the app shell has it. At rest a quiet row with a card's
         * hairline; the moment it is clicked or Ctrl K is pressed, the input.
         * An INPUT's boundary must clear 3:1 (WCAG 1.4.11, `border-input`), and
         * that is what read as "highlighted"; a BUTTON that opens the input has
         * no such boundary to keep, so the field keeps its tested border only
         * while it is being typed into.
         */}
        <div role="search" className="relative">
          {open ? (
            <>
              <label htmlFor={`${prefix}-find`} className="sr-only">
                Find a dashboard
              </label>
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={field}
                id={`${prefix}-find`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                onBlur={() => !query && setFinding(false)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${prefix}-find-hint`}
                aria-controls={`${prefix}-teams`}
                placeholder="Find a dashboard"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm shadow-none outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    field.current?.focus();
                  }}
                  className="absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-hidden"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">Clear the search</span>
                </button>
              )}
            </>
          ) : (
            <button
              ref={rest}
              type="button"
              data-find
              onClick={() => setFinding(true)}
              aria-describedby={`${prefix}-find-hint`}
              className="flex h-8 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-card/70 px-2 text-sm text-sidebar-foreground/60 outline-hidden transition-colors duration-fast ease-out hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1 text-left">Find a dashboard</span>
              <kbd aria-hidden="true" className="font-mono text-2xs text-sidebar-foreground/50">
                Ctrl K
              </kbd>
            </button>
          )}
          <p id={`${prefix}-find-hint`} className="sr-only">
            Shortcut: Control K. Filters the teams below as you type; Enter moves to the first result.
          </p>
          <p className="sr-only" aria-live="polite">
            {query ? `${found} ${found === 1 ? "dashboard matches" : "dashboards match"}` : ""}
          </p>
        </div>
      </div>

      {/* SidebarContent: scrolls on its own, so the page beside it never moves. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] lg:pb-16">
        <Remembered name="Pinned dashboards" title="Pinned" items={memory.pinned} memory={memory} empty="Pin a dashboard with the pin icon." />
        <Remembered
          name="Recent dashboards"
          title="Recent"
          items={memory.recent}
          memory={memory}
          empty="Dashboards you open appear here."
          action={
            memory.recent.length > 0 && (
              <button
                type="button"
                onClick={memory.clearRecent}
                className="ml-auto rounded-md px-1.5 text-2xs text-sidebar-foreground/70 outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                Clear<span className="sr-only"> recent dashboards</span>
              </button>
            )
          }
        />

        <nav id={`${prefix}-teams`} tabIndex={-1} aria-labelledby={`${prefix}-teams-h`} className="relative flex w-full min-w-0 flex-col p-2 pt-1 outline-none">
          <h2 id={`${prefix}-teams-h`} className={GROUP_LABEL}>
            Teams
          </h2>
          {matches.length === 0 ? (
            <p className="px-2 py-1 text-xs text-sidebar-foreground/70">
              No dashboard matches “{query}”.{" "}
              <button type="button" onClick={() => setQuery("")} className="font-medium text-sidebar-primary underline-offset-4 outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                Show all
              </button>
            </p>
          ) : (
            <ul className="flex w-full min-w-0 flex-col gap-0.5">
              {matches.map(({ team: t, links }) => {
                const open = !!query || opened.has(t.code);
                const subId = `${prefix}-team-${t.code}`;
                return (
                  <li key={t.code} className="group/menu-item relative">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={subId}
                      disabled={!!query}
                      onClick={() =>
                        setOpened((s) => {
                          const n = new Set(s);
                          if (n.has(t.code)) n.delete(t.code);
                          else n.add(t.code);
                          return n;
                        })
                      }
                      className={MENU_BUTTON}
                    >
                      <span className="w-9 shrink-0 font-mono text-2xs font-normal text-sidebar-foreground/60">{t.code}</span>
                      <span className="min-w-0 flex-1 truncate" title={t.name}>
                        {t.shortName}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className={cn("ml-auto text-sidebar-foreground/50 transition-transform duration-fast ease-out", open && "rotate-90")}
                      />
                    </button>
                    {/* SidebarMenuSub */}
                    <ul id={subId} hidden={!open} className="mx-3.5 flex min-w-0 translate-x-px flex-col border-l border-sidebar-border px-2.5 py-0.5">
                      {links.map((l) => (
                        <SubItem key={l.id} link={l} memory={memory} />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* The drilling journey (src/learn, built in its own session): an
            internal page, so a same-tab link, not a dashboard. */}
        <nav aria-label="Learn" className="relative flex w-full min-w-0 flex-col p-2 pt-1">
          <h2 className={GROUP_LABEL}>Learn</h2>
          <a href="#/learn" className={MENU_BUTTON}>
            <BookOpen aria-hidden="true" className="text-sidebar-foreground/60" />
            <span className="truncate">The drilling journey</span>
          </a>
        </nav>
      </div>
    </aside>
  );
}

function SubItem({ link, memory }: { link: DashboardLink; memory: Memory }) {
  const Icon = PLATFORM_ICON[link.platform];
  const pinned = memory.isPinned(link.id);
  return (
    <li className="group/menu-sub-item relative flex">
      <DashboardAnchor link={link} className={SUB_BUTTON}>
        <Icon aria-hidden="true" />
        <span>{link.label}</span>
      </DashboardAnchor>
      <PinToggle link={link} pinned={pinned} onTogglePin={memory.togglePin} className={MENU_ACTION} />
    </li>
  );
}

function Remembered({
  name,
  title,
  items,
  memory,
  empty,
  action,
}: {
  name: string;
  title: string;
  items: RememberedLink[];
  memory: Memory;
  empty: string;
  action?: ReactNode;
}) {
  return (
    <section aria-label={name} className="relative flex w-full min-w-0 flex-col px-2 pb-1">
      <div className="flex items-center">
        <h2 className={GROUP_LABEL}>{title}</h2>
        {action}
      </div>
      {items.length ? (
        <ul className="flex flex-col">
          {items.map(({ link, team }) => {
            const Icon = PLATFORM_ICON[link.platform];
            return (
              <li key={link.id} className="group/menu-sub-item relative flex">
                <DashboardAnchor link={link} className={cn(SUB_BUTTON, "translate-x-0")}>
                  <Icon aria-hidden="true" />
                  <span>{link.label}</span>
                  <span className="shrink-0 font-mono text-2xs text-sidebar-foreground/60">{team.code}</span>
                </DashboardAnchor>
                <PinToggle link={link} pinned={memory.isPinned(link.id)} onTogglePin={memory.togglePin} className={MENU_ACTION} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-2 pb-1 text-xs text-sidebar-foreground/60">{empty}</p>
      )}
    </section>
  );
}
