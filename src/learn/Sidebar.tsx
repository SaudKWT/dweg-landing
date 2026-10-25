/**
 * The learning page's sidebar: the hub's (landing/rig3/Sidebar.tsx), cut down
 * to what this page needs.
 *
 * Saud, 2026-10-25: "match the design of landing page header and sidebar. put
 * the chapters in the sidebar", then "when in the learning page, we dont need
 * to show the dashboards anymore. just have a way to go back to the home".
 *
 * So: the hub's brand row (the KOC emblem, DWEG, Kuwait Oil Company), a Home
 * item back to the hub, and the drilling journey opening onto its chapters, nested
 * the way a team opens onto its dashboards. No find field, pinned, recent or
 * teams. The classes are the hub's — its SidebarHeader / SidebarGroupLabel /
 * SidebarMenuButton / SidebarMenuSub / SidebarMenuSubButton, ported from the
 * design system's @koc/sidebar onto the --sidebar-* tokens — so the two pages
 * read as one app.
 */

import { useState } from "react";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";

import { cn } from "@/koc";

import { GROUP } from "../landing/data";
import { CHAPTERS } from "./content";
import emblem from "./koc-emblem.svg";

/** Home: the hub. */
const HOME = "#/landing/rig3";

/** SidebarMenuButton, default size. */
const MENU_BUTTON =
  "peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium ring-sidebar-ring outline-hidden transition-[background-color,color] duration-fast ease-out hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0";
/** SidebarMenuSubButton, md. */
const SUB_BUTTON =
  "flex h-7 min-w-0 flex-1 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground";
/** SidebarGroupLabel. */
const GROUP_LABEL = "flex h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70";

const ITEMS = [
  ...CHAPTERS.map((c) => ({ id: `learn-${c.id}`, num: c.numeral, name: c.name })),
  { id: "learn-check", num: "07", name: "Check yourself" },
];

export function Sidebar({
  prefix,
  activeChapter,
  onChapter,
}: {
  /** The page's id prefix, so two pages' DOM ids never collide. */
  prefix: string;
  /** Chapter being read: an index into CHAPTERS, CHAPTERS.length for the questions, -1 for the opening. */
  activeChapter: number;
  /** Go to a chapter's section id. */
  onChapter: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      aria-label="Field guide"
      className="flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-svh lg:w-72 lg:border-r lg:border-b-0"
    >
      {/* SidebarHeader: the hub's brand row, which also leads home. */}
      <div className="flex flex-col gap-2 p-2">
        <a href={HOME} className="flex h-14 items-center gap-2.5 rounded-md px-1 outline-hidden ring-sidebar-ring focus-visible:ring-2">
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
          <span className="sr-only"> — home</span>
        </a>
      </div>

      {/* SidebarContent */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] lg:pb-16">
        <nav aria-label="Home" className="relative flex w-full min-w-0 flex-col p-2 pt-0">
          <a href={HOME} className={MENU_BUTTON}>
            <ArrowLeft aria-hidden="true" className="text-sidebar-primary" />
            <span className="truncate">Back to home</span>
          </a>
        </nav>

        <nav aria-labelledby={`${prefix}-learn-h`} className="relative flex w-full min-w-0 flex-col p-2 pt-1">
          <h2 id={`${prefix}-learn-h`} className={GROUP_LABEL}>
            Learn
          </h2>
          <ul className="flex w-full min-w-0 flex-col gap-0.5">
            <li className="group/menu-item relative">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${prefix}-chapters`}
                onClick={() => setOpen((o) => !o)}
                className={cn(MENU_BUTTON, "bg-sidebar-accent/60 text-sidebar-accent-foreground")}
              >
                <BookOpen aria-hidden="true" className="text-sidebar-primary" />
                <span className="min-w-0 flex-1 truncate">The drilling journey</span>
                <span className="sr-only">, this page</span>
                <ChevronRight aria-hidden="true" className={cn("ml-auto text-sidebar-foreground/50 transition-transform duration-fast ease-out", open && "rotate-90")} />
              </button>
              {/* SidebarMenuSub: the chapters, the way a team lists its dashboards. */}
              <ul id={`${prefix}-chapters`} hidden={!open} className="mx-3.5 flex min-w-0 translate-x-px flex-col border-l border-sidebar-border px-2.5 py-0.5">
                {ITEMS.map((c, i) => {
                  const current = i === activeChapter;
                  return (
                    <li key={c.id} className="relative flex">
                      <button
                        type="button"
                        onClick={() => onChapter(c.id)}
                        aria-current={current ? "location" : undefined}
                        className={cn(SUB_BUTTON, current && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")}
                      >
                        <span className="w-5 shrink-0 font-mono text-2xs font-normal text-sidebar-primary">{c.num}</span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      </button>
                      {/* The current chapter's marker, on the sub-menu's rule. */}
                      {current && <span aria-hidden="true" className="absolute -left-[11px] top-1 h-5 w-0.5 rounded-full bg-sidebar-primary" />}
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
