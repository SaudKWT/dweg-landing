/**
 * Every view the learning page can scroll to. A stop is a camera keyframe in
 * one of three scenes — the rig and its well, the geology block, the map of
 * Kuwait — plus what to pick out there. The page's text steps name a stop by
 * id; the scene flies between them.
 *
 * Captions live in ../content.ts. Figures on labels describe the illustrative
 * rig and well (./rig.ts, ./well.ts), never a KOC asset.
 */

import { type V3 } from "./math";
import { type PartId } from "./rig";
import { type Region, FIELDS, PLACES, fieldAnchor, placeAnchor } from "./map";
import { UNITS, WELLS, XH, ZH, topAt, yOf } from "./geology";
import { BHA, BHA_TOP, CASING, DP_JOINT, FORMATIONS, KOP_MD, LANDING_MD, RKB, TD, fmtFt, station } from "./well";

export type SceneId = "rig" | "block" | "map";

export interface Cam {
  /** Look at the well path at this MD… */
  md?: number;
  /** …or at a rig component… */
  part?: PartId;
  /** …or at this world point. */
  target?: V3;
  dist: number;
  /** Radians about y, from +z towards +x. */
  yaw: number;
  pitch: number;
  /** Radial exaggeration of everything downhole. 1 = true proportion. */
  exag?: number;
  fov?: number;
}

export interface Stop {
  id: string;
  scene: SceneId;
  cam: Cam;
  /** Rig components to pick out in KOC blue. */
  hi?: PartId[];
  /** Run the mud round its loop. */
  flow?: boolean;
  /** Map: the region to pick out. */
  region?: Region;
  /** Block: units to pick out by name; the rest step back. */
  units?: string[];
  /** Force a layer on or off; otherwise the camera decides. */
  rig?: boolean;
  field?: boolean;
  /** Show the MD / TVD / Inc readout. */
  hud?: boolean;
}

const part = (kind: string, nth = 0) => BHA.filter((p) => p.kind === kind)[nth];
const mid = (p: { top: number; bottom: number }) => (p.top + p.bottom) / 2;
/** A drill-pipe connection near 2,200 ft MD, in the vertical section. */
const JOINT = BHA_TOP - DP_JOINT * Math.round((BHA_TOP - 2200) / DP_JOINT);

export const STOPS: Stop[] = [
  /* Hero */
  { id: "hero", scene: "rig", cam: { target: [-30, 70, -10], dist: 1050, yaw: -0.85, pitch: 0.17, exag: 7 } },

  /* 02 · The rig */
  { id: "rig", scene: "rig", cam: { target: [-12, 80, -10], dist: 780, yaw: -0.72, pitch: 0.2, exag: 7 } },
  { id: "hoist", scene: "rig", cam: { target: [6, 100, 0], dist: 410, yaw: -1.25, pitch: 0.1, exag: 7 }, hi: ["crown", "block", "drawworks"] },
  { id: "rotate", scene: "rig", cam: { part: "topdrive", dist: 105, yaw: -0.95, pitch: 0.12, exag: 7 }, hi: ["topdrive"] },
  { id: "circulate", scene: "rig", cam: { target: [-4, 44, -38], dist: 420, yaw: -2.2, pitch: 0.22, exag: 7 }, hi: ["pumps", "standpipe", "shakers", "tanks"], flow: true },
  { id: "control", scene: "rig", cam: { target: [-6, 10, 5], dist: 84, yaw: -1.35, pitch: 0.06, exag: 7 }, hi: ["bop", "accumulator"] },
  { id: "power", scene: "rig", cam: { target: [-2, 8, -100], dist: 280, yaw: 2.55, pitch: 0.32, exag: 7 }, hi: ["generators"] },
  { id: "pipe", scene: "rig", cam: { target: [-58, 52, 0], dist: 380, yaw: -1.05, pitch: 0.22, exag: 7 }, hi: ["racks", "catwalk", "board"] },

  /* 03 · Beneath Kuwait */
  { id: "descend", scene: "rig", cam: { target: [1950, -3000, 0], dist: 15200, yaw: -0.16, pitch: 0.05, exag: 52, fov: 28 } },
  { id: "block", scene: "block", cam: { target: [0, -17000, 0], dist: 240000, yaw: -0.62, pitch: 0.36, fov: 30 } },
  { id: "trap", scene: "block", cam: { target: [6000, yOf(4500), ZH], dist: 108000, yaw: -0.06, pitch: 0.03, fov: 30 }, units: ["Ahmadi", "Wara", "Mauddud", "Burgan"] },
  { id: "column", scene: "block", cam: { target: [-XH + 15000, yOf(7600), ZH], dist: 84000, yaw: 0.28, pitch: 0.04, fov: 30 } },

  /* 04 · The fields */
  { id: "kuwait", scene: "map", cam: { target: [1500, 0, -1500], dist: 108000, yaw: -0.12, pitch: 0.98, fov: 30 } },
  { id: "north", scene: "map", cam: { target: [-2500, 0, -13500], dist: 74000, yaw: -0.18, pitch: 0.86, fov: 30 }, region: "north" },
  { id: "west", scene: "map", cam: { target: [-1500, 0, 7000], dist: 70000, yaw: 0.22, pitch: 0.84, fov: 30 }, region: "west" },
  { id: "south", scene: "map", cam: { target: [7500, 0, 9500], dist: 64000, yaw: -0.3, pitch: 0.84, fov: 30 }, region: "south" },

  /* 05 · Drilling a well */
  { id: "spud", scene: "rig", cam: { target: [0, -640, 0], dist: 2900, yaw: -0.5, pitch: 0.03, exag: 40 }, rig: true, field: false, hud: true },
  { id: "casing", scene: "rig", cam: { md: CASING[1].shoe + 1, dist: 24, yaw: -0.85, pitch: 0.6, exag: 1 }, hud: true },
  { id: "directional", scene: "rig", cam: { target: [1950, -3000, 0], dist: 15200, yaw: -0.16, pitch: 0.05, exag: 52, fov: 28 }, hud: true },
  { id: "build", scene: "rig", cam: { md: 4380, dist: 1000, yaw: -0.16, pitch: 0.07, exag: 16 }, hud: true },
  { id: "cuttings", scene: "rig", cam: { md: TD - 20, dist: 11, yaw: -2.05, pitch: 0.3, exag: 1, fov: 36 }, hud: true },
  { id: "td", scene: "rig", cam: { md: TD - 1500, dist: 8200, yaw: -0.22, pitch: 0.08, exag: 42 }, hud: true },

  /* 06 · The drill string */
  { id: "dp", scene: "rig", cam: { md: JOINT + 0.4, dist: 6.5, yaw: -0.8, pitch: 0.22, exag: 1 }, hud: true },
  { id: "hwdp", scene: "rig", cam: { md: mid(part("jar")) + 2, dist: 15, yaw: -2.15, pitch: 0.32, exag: 1, fov: 34 }, hud: true },
  { id: "mwd", scene: "rig", cam: { md: mid(part("mwd")) + 2, dist: 15, yaw: -2.1, pitch: 0.3, exag: 1, fov: 34 }, hud: true },
  { id: "rss", scene: "rig", cam: { md: TD - 9, dist: 16, yaw: -2.05, pitch: 0.3, exag: 1, fov: 34 }, hud: true },
  { id: "bit", scene: "rig", cam: { md: TD - 0.9, dist: 4.7, yaw: 1.0, pitch: 0.24, exag: 1 }, hud: true },
];

export const stopIndex = (id: string) => {
  const i = STOPS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`Unknown stop ${id}`);
  return i;
};

export interface SceneLabel {
  text: string;
  md?: number;
  at?: V3;
  /** Stops (by id) that show it. */
  in: string[];
  side?: "left" | "right" | "below";
  /** "tick": small, unboxed — for dense annotation like formation tops. */
  kind?: "tick";
}

const land = station(LANDING_MD);
const crestFace = (name: string, x = -XH): V3 => {
  const i = UNITS.findIndex((u) => u.name === name);
  const u = UNITS[i];
  const next = UNITS[i + 1];
  const t0 = topAt(u, x, ZH);
  const t1 = next ? topAt(next, x, ZH) : 15000;
  return [x, yOf((t0 + t1) / 2), ZH];
};

export const LABELS: SceneLabel[] = [
  // Hero and overview
  { text: "Mast · 142 ft", at: [5, RKB + 120, 8], in: ["rig"] },
  { text: "Drill floor · 30 ft", at: [-18, RKB + 1, 18], in: ["rig"], side: "left" },
  { text: "Mud system", at: [-2, 9, -48], in: ["rig"], side: "left" },
  { text: "Pipe racks", at: [-96, 6, 20], in: ["rig"], side: "left" },
  // Hoisting
  { text: "Crown block · Fixed sheaves", at: [0.2, RKB + 146, 0], in: ["hoist"] },
  { text: "Travelling block · Moving sheaves", at: [0.2, 108, 2.5], in: ["hoist"] },
  { text: "Drilling line", at: [8, 140, 3.2], in: ["hoist"], side: "left" },
  { text: "Drawworks · The winch", at: [18, RKB + 7, 7], in: ["hoist"] },
  // Rotating
  { text: "Top drive · Motor and gearbox", at: [1.8, 92, 1.5], in: ["rotate"] },
  { text: "Bails · Hang it from the block", at: [0.2, 99, 1], in: ["rotate"], side: "left" },
  { text: "Guide dolly · Rides the torque track", at: [4, 86, 1.6], in: ["rotate"] },
  // Circulating
  { text: "Mud pumps · Triplex", at: [-6, 7, -72], in: ["circulate"], side: "left" },
  { text: "Standpipe", at: [9.5, RKB + 40, -9], in: ["circulate"] },
  { text: "Rotary hose", at: [6, 92, -6], in: ["circulate"] },
  { text: "Shale shakers", at: [2, 11, -28], in: ["circulate"] },
  { text: "Mud tanks", at: [20, 10, -42], in: ["circulate"] },
  // Well control
  { text: "Annular preventer", at: [0, 14.5, 2.5], in: ["control"] },
  { text: "Ram preventers", at: [0, 6, 5.8], in: ["control"], side: "left" },
  { text: "Wellhead", at: [0, 1.5, 1.3], in: ["control"], side: "below" },
  { text: "Accumulator · Stored hydraulic pressure", at: [-25, 9.5, 25], in: ["control"], side: "left" },
  // Power
  { text: "Generators · Diesel engines", at: [-24, 10, -98], in: ["power"] },
  { text: "Fuel and water tanks", at: [-30, 10, -126], in: ["power"], side: "left" },
  // Pipe handling
  { text: "Racking board · 88 ft", at: [-11, RKB + 90, 9], in: ["pipe"], side: "left" },
  { text: "Catwalk · V-door ramp", at: [-40, 18, 3], in: ["pipe"] },
  { text: "Pipe racks", at: [-96, 6, 20], in: ["pipe"], side: "left" },
  // The well in section
  ...FORMATIONS.map((f, i) => {
    const next = FORMATIONS[i + 1]?.top ?? 4900;
    return { text: f.name, at: [-1150, RKB - (f.top + next) / 2, -350] as V3, in: ["descend"], kind: "tick" as const };
  }),
  { text: `Reservoir · Wara and Burgan sands`, md: LANDING_MD + 1200, in: ["descend"], side: "below" },
  // The block
  { text: "The crest", at: [0, yOf(3560) + 1200, ZH], in: ["block"] },
  { text: "Ground level", at: [-XH, 0, ZH], in: ["block"], side: "left" },
  { text: "Seal · Ahmadi Shale", at: [-15000, yOf(topAt(UNITS[6], -15000, ZH) + 50), ZH], in: ["trap"] },
  { text: "Oil · Trapped under the crest", at: [9000, yOf(4200), ZH], in: ["trap"] },
  { text: "Water · Below the contact", at: [18000, yOf(5700), ZH], in: ["trap"], side: "below" },
  ...WELLS.map((w, i) => ({ text: `${w.label} · ${w.spec}`, at: [w.x, yOf(w.td), ZH] as V3, in: ["trap"], side: i ? ("left" as const) : ("below" as const) })),
  ...UNITS.map((u) => ({ text: u.name, at: crestFace(u.name), in: ["column"], kind: "tick" as const, side: "left" as const })),
  // The map
  ...FIELDS.map((f) => ({ text: f.name, at: fieldAnchor(f), in: ["kuwait", f.region], side: f.side })),
  ...PLACES.map((p) => ({ text: p.name, at: placeAnchor(p.at), in: ["kuwait"], kind: "tick" as const })),
  // Drilling a well
  { text: "Conductor · 20″ · 250 ft", md: 200, in: ["spud"] },
  { text: `Surface casing · 13⅜″ · ${fmtFt(CASING[1].shoe)}`, md: 1300, in: ["spud"], side: "left" },
  { text: "13⅜″ float shoe", md: CASING[1].shoe - 0.8, in: ["casing"] },
  { text: "9⅝″ casing", md: CASING[1].shoe - 6, in: ["casing"], side: "left" },
  { text: "12¼″ open hole", md: CASING[1].shoe + 6, in: ["casing"] },
  { text: `Kick-off point · ${fmtFt(KOP_MD)}`, md: KOP_MD, in: ["directional"] },
  { text: `Build · 4°/100 ft`, md: 3900, in: ["directional"] },
  { text: `Lands · ${fmtFt(land.tvd)} TVD`, md: LANDING_MD, in: ["directional"], side: "below" },
  { text: `Lateral · 3,000 ft in the sand`, md: TD - 1500, in: ["directional"], side: "below" },
  { text: "Tool joints on the low side", md: 4420, in: ["build"] },
  { text: "9⅝″ couplings every 40 ft", md: 4600, in: ["build"], side: "below" },
  { text: "Cuttings · Carried up the annulus", md: TD - 60, in: ["cuttings"], side: "below" },
  { text: "Rotary steerable", md: mid(part("rss")), in: ["cuttings"] },
  { text: `TD · ${fmtFt(TD)} MD`, md: TD, in: ["td"], side: "below" },
  { text: "9⅝″ shoe", md: CASING[2].shoe, in: ["td"] },
  // The drill string
  { text: "Tool joint · Threaded, thicker wall", md: JOINT + 0.6, in: ["dp"] },
  { text: "5″ drill pipe · ~31 ft joints", md: JOINT + 2.4, in: ["dp"], side: "left" },
  { text: "9⅝″ casing", md: JOINT - 1.6, in: ["dp"], side: "left" },
  { text: "Heavy-weight drill pipe", md: part("jar").top - 8, in: ["hwdp"], side: "left" },
  { text: "Drilling jar", md: mid(part("jar")), in: ["hwdp"] },
  { text: "Stabiliser", md: mid(part("stab", 1)), in: ["mwd"], side: "below" },
  { text: "MWD · Mud-pulse telemetry", md: part("mwd").bottom - 5, in: ["mwd"] },
  { text: "Non-magnetic collar", md: mid(part("nmdc")), in: ["mwd"], side: "left" },
  { text: "LWD · Resistivity", md: mid(part("lwd")), in: ["mwd"], side: "below" },
  { text: "Rotary steerable", md: mid(part("rss")), in: ["rss"] },
  { text: "Stabiliser", md: mid(part("stab", 0)), in: ["rss"], side: "left" },
  { text: "16 mm PDC cutters", md: TD - 0.08, in: ["bit"] },
  { text: "Steering pads", md: TD - 3, in: ["bit"], side: "left" },
];
