/**
 * The four plates: where each is cut from the desert, how the turntable frames
 * it, and what its callouts point at.
 *
 * F told the story as one strip of desert seen through fog. Here each chapter
 * is a round plinth cut out of that same ground (terrain.ts) and set on I's
 * rotary-table dial, the way INFRA stands a product on the page. Nothing
 * outside the plinth is drawn — a pipeline that runs off the plate is cut
 * clean at the rim, like a section.
 *
 * Light on purpose: the page imports this for its labels before the models
 * and the renderer have loaded.
 */

import { CENTERS, TEAM_ANCHORS } from "./anchors";
import { m4, type V3 } from "./math";
import { heightAt } from "./terrain";

const ft = (x: number) => x * 0.3048;
const DEG = Math.PI / 180;

export interface PlateDef {
  /** Plinth centre on the ground plane (x, z). */
  cx: number;
  cz: number;
  /** Plinth radius, metres. */
  radius: number;
  /** Highest point the camera must keep in frame (the crown, a mast top). */
  top: number;
  /** Turntable azimuth and elevation at rest. */
  azimuth: number;
  elevation: number;
  /** Blueprint grid on the ground surface, metres per cell. */
  grid: number;
  /** Contour interval on the ground surface, metres. */
  contour: number;
}

/** Ground height at a chapter-relative offset. */
const g = (ch: number, dx: number, dz: number) => heightAt(CENTERS[ch][0] + dx, CENTERS[ch][2] + dz);

const G0 = g(0, 0, 0);
const G1 = g(1, 0, 0);

export const PLATES: PlateDef[] = [
  // I · Bahra: the derrick, its combination-rig gear, the survey party and camp.
  { cx: CENTERS[0][0] + 2, cz: CENTERS[0][2] + 8, radius: 36, top: G0 + 2.3 + ft(122) + 3.4, azimuth: -0.62, elevation: 24 * DEG, grid: 3, contour: 0.5 },
  // II · Burgan No. 1, the stock tanks and the seawater line.
  { cx: CENTERS[1][0] - 1, cz: CENTERS[1][2] + 6, radius: 40, top: G1 + 2.4 + ft(122) + 3.4, azimuth: -0.5, elevation: 24 * DEG, grid: 3, contour: 0.5 },
  // III · the hilltop tanks, the shore and the tanker at its berth.
  { cx: CENTERS[2][0], cz: CENTERS[2][2] - 18, radius: 122, top: 34, azimuth: -0.56, elevation: 30 * DEG, grid: 8, contour: 2 },
  // IV · a rig pad today.
  { cx: CENTERS[3][0] - 2, cz: CENTERS[3][2], radius: 75, top: 3 + ft(30) + ft(142) + 2, azimuth: -0.66, elevation: 26 * DEG, grid: 5, contour: 1 },
];

/** Lowest ground inside a plate, sampled — the plinth's cut face starts below it. */
export function plateFloor(p: PlateDef): number {
  let lo = Infinity;
  for (let r = 0; r <= 8; r++)
    for (let a = 0; a < 48; a++) {
      const rr = (r / 8) * p.radius;
      const t = (a / 48) * Math.PI * 2;
      lo = Math.min(lo, heightAt(p.cx + Math.cos(t) * rr, p.cz + Math.sin(t) * rr));
    }
  return lo;
}

/** Where the plinth's base (and the dial under it) sits. */
export function plateBase(p: PlateDef): number {
  return plateFloor(p) - Math.max(3, p.radius * 0.13);
}

// ── Callouts ───────────────────────────────────────────────────────────────

export interface CalloutDef {
  id: string;
  /** Set in italic serif, like INFRA's part names. */
  title: string;
  /** Small caps line under it. */
  spec: string;
  at: V3;
}

/** A point in a rotated model's local frame, as F's models place it: T(at) · Ry(rot). */
function local(ch: number, rot: number, p: V3, y0 = g(ch, 0, 0)): V3 {
  const c = CENTERS[ch];
  return m4.transformPoint(m4.compose(m4.translation(c[0], y0, c[2]), m4.rotY(rot)), p);
}
const world = (ch: number, dx: number, dy: number, dz: number): V3 => [
  CENTERS[ch][0] + dx,
  g(ch, dx, dz) + dy,
  CENTERS[ch][2] + dz,
];

// Bahra's derrick: rot 0.35, floor 2.3 m. Burgan's: rot −0.25, floor 2.4 m.
// No height is labelled anywhere: history.ts records why (no source settles it).
const halfAt = (y: number) => (ft(24) + (ft(5.5) - ft(24)) * (y / ft(122))) / 2;

export const CALLOUTS: CalloutDef[][] = [
  [
    { id: "crown", title: "Steel derrick", spec: "Four legs, X-braced · period standard", at: local(0, 0.35, [halfAt(24), 2.3 + 24, halfAt(24)]) },
    { id: "beam", title: "Walking beam", spec: "Cable-tool gear, combination rig", at: local(0, 0.35, [-2.4, 2.3 + 4.2, 0]) },
    { id: "engine", title: "Engine house", spec: "Gasoline: too little water for steam", at: local(0, 0.35, [-12.8, 2.95, 0.6]) },
    { id: "survey", title: "Survey party", spec: "Theodolite on its tripod", at: world(0, -4, 1.7, 24) },
    { id: "camp", title: "Camp", spec: "Ridge tents · a 1930s stake truck", at: world(0, 24.5, 2.7, 12) },
  ],
  [
    { id: "derrick", title: "Burgan No. 1", spec: "Spudded October 1937", at: local(1, -0.25, [halfAt(22), 2.4 + 22, -halfAt(22)]) },
    { id: "rig", title: "The rig from Bahra", spec: "The same combination rig, moved south", at: local(1, -0.25, [-2.4, 2.4 + 4.2, 0]) },
    { id: "water", title: "Seawater line", spec: "Drilling water, piped from the coast", at: world(1, -30, 4.6, 6) },
    { id: "tanks", title: "Stock tanks", spec: "Field tanks with cone roofs", at: world(1, 18, 5.4, -14) },
    { id: "rack", title: "Pipe rack", spec: "Drill pipe by the V-door", at: world(1, 12, 1.3, 8) },
  ],
  [
    { id: "hilltop", title: "Hilltop tanks", spec: "Four, gravity-fed to the sea", at: world(2, -25, 15.2, -80) },
    { id: "wheel", title: "The silver wheel", spec: "Turned on 30 June 1946", at: world(2, 2, 1.95, -42.6) },
    { id: "lines", title: "Submarine lines", spec: "No pier yet — loaded offshore", at: world(2, 2, 0.4, 24) },
    { id: "ship", title: "British Fusilier", spec: "10,567 tons in 11 h 13 min", at: [CENTERS[2][0] - 9, 15.5, CENTERS[2][2] + 66] },
  ],
  [],
];

/** Chapter IV's callouts are the eight teams, each pinned to a part of the pad. */
export const TEAM_PART: Record<string, string> = {
  EN01: "Office caravan",
  EN11: "Contracted power and pumps",
  EN31: "Water and supply",
  EN41: "Muster point and windsock",
  EN51: "The mast",
  EN61: "Wellhead and BOP stack",
  EN71: "Pipe racks",
  EN81: "Coiled tubing unit",
};

export { TEAM_ANCHORS };
