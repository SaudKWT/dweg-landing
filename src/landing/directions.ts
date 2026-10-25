/**
 * The landing-page directions under comparison, in two rounds:
 *   v1 (a–i)   first round, optimised for first impression. Kept as backup.
 *   v2 (a2–i2) the daily-use rework (V2-BRIEF.md): pins and recents, find,
 *              compact KPIs, no hunting, visuals only in empty space and a
 *              large footer. Each v2 folder started as a copy of its v1.
 *
 * v1: A–D from this worktree, E–I merged
 * in from their own branches (E drilling-workover-landing-ff3db3, F exciting-jang,
 * G interesting-cori, H priceless-bohr, I cranky-dhawan).
 *
 * Each lives in its own folder and owns ONLY that folder: `index.tsx` (a full
 * page, default export) and `meta.ts`. Nothing is shared between directions
 * except `data.ts` and `shared.tsx`, so no builder can nudge another's result.
 *
 * v3 (fe3, fi3, if3, fei3) mixes rounds: one direction's top half with
 * another's showpiece. The letters say which: F·E is F's page with E's well;
 * F·E·I is F's page with E's rig, drawn in I's style.
 *
 * Lazy-loaded so the docs site does not pay for four landing pages (and one
 * WebGL renderer) on every section.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

import { meta as a } from "./a/meta";
import { meta as b } from "./b/meta";
import { meta as c } from "./c/meta";
import { meta as d } from "./d/meta";
import { meta as e } from "./e/meta";
import { meta as f } from "./f/meta";
import { meta as g } from "./g/meta";
import { meta as h } from "./h/meta";
import { meta as i } from "./i/meta";
import { meta as a2 } from "./a2/meta";
import { meta as b2 } from "./b2/meta";
import { meta as c2 } from "./c2/meta";
import { meta as d2 } from "./d2/meta";
import { meta as e2 } from "./e2/meta";
import { meta as f2 } from "./f2/meta";
import { meta as g2 } from "./g2/meta";
import { meta as h2 } from "./h2/meta";
import { meta as i2 } from "./i2/meta";
import { meta as fe3 } from "./fe3/meta";
import { meta as fi3 } from "./fi3/meta";
import { meta as if3 } from "./if3/meta";
import { meta as fei3 } from "./fei3/meta";
import { meta as fly3 } from "./fly3/meta";
import { meta as rig3 } from "./rig3/meta";

export interface DirectionMeta {
  id:
    | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i"
    | "a2" | "b2" | "c2" | "d2" | "e2" | "f2" | "g2" | "h2" | "i2"
    | "fe3" | "fi3" | "if3" | "fei3" | "fly3" | "rig3";
  /** What the viewer bar prints, when the letters would not say it ("Fly"). */
  badge?: string;
  /** Plain, evocative name — "Strata", not "Direction 2". */
  name: string;
  /** One sentence: the idea, not the features. */
  oneLiner: string;
  /** Awwwards / other references drawn on — "Name — url". */
  references: string[];
  /** 21st.dev components ported (never installed) — "Name — url". */
  components: string[];
}

export interface Direction extends DirectionMeta {
  Page: LazyExoticComponent<ComponentType>;
}

export const DIRECTIONS: Direction[] = [
  { ...a, Page: lazy(() => import("./a")) },
  { ...b, Page: lazy(() => import("./b")) },
  { ...c, Page: lazy(() => import("./c")) },
  { ...d, Page: lazy(() => import("./d")) },
  { ...e, Page: lazy(() => import("./e")) },
  { ...f, Page: lazy(() => import("./f")) },
  { ...g, Page: lazy(() => import("./g")) },
  { ...h, Page: lazy(() => import("./h")) },
  { ...i, Page: lazy(() => import("./i")) },
  { ...a2, Page: lazy(() => import("./a2")) },
  { ...b2, Page: lazy(() => import("./b2")) },
  { ...c2, Page: lazy(() => import("./c2")) },
  { ...d2, Page: lazy(() => import("./d2")) },
  { ...e2, Page: lazy(() => import("./e2")) },
  { ...f2, Page: lazy(() => import("./f2")) },
  { ...g2, Page: lazy(() => import("./g2")) },
  { ...h2, Page: lazy(() => import("./h2")) },
  { ...i2, Page: lazy(() => import("./i2")) },
  { ...fe3, Page: lazy(() => import("./fe3")) },
  { ...fi3, Page: lazy(() => import("./fi3")) },
  { ...if3, Page: lazy(() => import("./if3")) },
  { ...fei3, Page: lazy(() => import("./fei3")) },
  { ...fly3, Page: lazy(() => import("./fly3")) },
  { ...rig3, Page: lazy(() => import("./rig3")) },
];

export type Round = 1 | 2 | 3;
export const ROUNDS: Round[] = [1, 2, 3];

/** "a2" → 2, "fe3" → 3, "a" → 1. The round is encoded in the id so no branch has to agree on a new field. */
export function versionOf(id: Direction["id"]): Round {
  return id.endsWith("3") ? 3 : id.endsWith("2") ? 2 : 1;
}

/** "a2" → "a", "fe3" → "fe". */
export function letterOf(id: Direction["id"]): string {
  return id.replace(/[23]$/, "");
}

/** What the viewer bar prints: "A", or "F·E" for a v3 mix. */
export function badgeOf(id: Direction["id"]): string {
  return DIRECTIONS.find((d) => d.id === id)?.badge ?? letterOf(id).toUpperCase().split("").join("·");
}

export const LANDING_HASH = "#/landing/";

/** `#/landing/b` → "b"; anything else → null. */
export function directionFromHash(hash: string): Direction["id"] | null {
  if (!hash.startsWith(LANDING_HASH)) return null;
  const id = hash.slice(LANDING_HASH.length).split(/[?/]/)[0];
  return DIRECTIONS.some((d) => d.id === id) ? (id as Direction["id"]) : null;
}
