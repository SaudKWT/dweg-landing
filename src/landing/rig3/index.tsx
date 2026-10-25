/**
 * v3 "Rig" — the same page as "Fly" (sidebar of teams with their dashboards
 * nested, F·E·I's title, the figures as ruled stations underneath), with
 * Saud's second ask, 2026-10-25: "change the hero to match the drilling rig we
 * created" — F·E·I's rig in its oil field, and its tour down the well.
 *
 * Copied, not imported: each direction owns only its own folder.
 */

import { useMemo, useState } from "react";

import { matchDashboards, useDashboardMemory } from "../shared";
import { Figures } from "./Figures";
import { Insights } from "./Insights";
import { WellStage } from "./Stage";
import { Sidebar } from "./Sidebar";

const PREFIX = "rig3";

export default function DirectionRig3() {
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
          <WellStage id="rig3-tour" />
          <Figures prefix={PREFIX} />
        </div>
        {/* Scrolling down opens the highlights into the detail behind them. */}
        <Insights prefix={PREFIX} />
      </main>
    </div>
  );
}
