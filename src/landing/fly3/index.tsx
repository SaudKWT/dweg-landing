/**
 * v3 "Fly" — Saud, 2026-10-25: "an infinitely scrolling hero similar to V1-D
 * but with our new F·E·I design … the same title from F·E·I … the group links
 * on the left sidebar and the individual dashboards nested — reference our
 * design system for the sidebar — and below the hero the KPI figure cards."
 *
 *   sidebar   find (Ctrl+K), pinned, recent, then every team with its
 *             dashboards nested, as the design system's sidebar nests a sub-menu
 *   hero      F·E·I's title over an endless flight across the oil field
 *   figures   the twelve figures as Datum's ruled stations, at the foot of the
 *             first screen
 *
 * Everything is one screen: the hero takes what the figures leave.
 * Copied, not imported: each direction owns only its own folder.
 */

import { useMemo, useState } from "react";

import { matchDashboards, useDashboardMemory } from "../shared";
import { Figures } from "./Figures";
import { Insights } from "./Insights";
import { Hero } from "./Hero";
import { Sidebar } from "./Sidebar";

const PREFIX = "fly3";

export default function DirectionFly3() {
  const memory = useDashboardMemory();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => matchDashboards(query), [query]);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground lg:flex-row">
      {/* First tab stop. A button, not href="#…": the viewer is hash-routed. */}
      <button
        type="button"
        onClick={() => document.getElementById(`${PREFIX}-teams`)?.focus()}
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to dashboards
      </button>
      <Sidebar prefix={PREFIX} query={query} setQuery={setQuery} matches={matches} memory={memory} />
      <main className="min-w-0 flex-1">
        {/* The first screen: the hero and the highlights. */}
        <div className="flex flex-col lg:h-svh">
          <Hero />
          <Figures prefix={PREFIX} />
        </div>
        {/* Scrolling down opens the highlights into the detail behind them. */}
        <Insights prefix={PREFIX} />
      </main>
    </div>
  );
}
