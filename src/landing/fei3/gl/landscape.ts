/**
 * The oil field around the rig, in place of a grid (Saud: "a subtle landscape
 * with rigs in the background and some Christmas trees, to show that it's an
 * actual oil field").
 *
 * Everything is clay, like the rig, and the scene's distance fog takes it out
 * to the page, so the field runs to the horizon without an edge:
 *   - low desert swell, graded flat under every pad;
 *   - three more rigs out in the field — E's rig, re-placed and turned;
 *   - producing wells: Christmas trees on their cellar pads, each with a
 *     flowline running over the ground to a gathering station;
 *   - the gathering station: storage tanks, two separators, a control room.
 *
 * Illustrative, like the rest of the well. Units: ft, y up, the well at the origin.
 */

import { Geo } from "./geometry";
import { type M4, type V3, multiply } from "./math";
import type { Rig, RigMat } from "./rig";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A deterministic PRNG, so the field is the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rigs out in the field: x, z, heading. Placed where the tour's opening view looks. */
const RIG_SITES: [number, number, number][] = [
  [1450, -1150, 0.7], // right of the mast, mid-distance
  [1150, -2500, -0.5], // left of it, further out
  [1050, -1750, 1.9], // nearer, to the side
];

const STATION: [number, number] = [2050, -1500];

/** Graded pads: the main rig, the field rigs, the station. [x, z, radius]. */
const PADS: [number, number, number][] = [
  [-20, 0, 260],
  ...RIG_SITES.map(([x, z]) => [x, z, 220] as [number, number, number]),
  [STATION[0], STATION[1], 180],
];

/** Ground height, ft: a low swell, flat on every pad. */
export function groundAt(x: number, z: number): number {
  let flat = 1;
  for (const [px, pz, r] of PADS) flat = Math.min(flat, smooth(r, r * 2.6, Math.hypot(x - px, z - pz)));
  // Low dunes, their crests running across the prevailing wind.
  const swell =
    16 * Math.sin(x * 0.0042 + Math.sin(z * 0.0021) * 2.2) * Math.sin(z * 0.0031 + 1.3) +
    7 * Math.sin(x * 0.0093 - z * 0.0071 + 0.7) +
    2.5 * Math.sin(x * 0.019 + z * 0.015);
  return (swell - 4) * flat;
}

/** The desert: a polar mesh around the well, finer near it, out past where the fog takes it. */
function terrain(): Geo {
  const g = new Geo();
  const SEG = 256;
  const rings: number[] = [0];
  for (let r = 30; r < 26000; r *= 1.055) rings.push(r);
  const e = 6;
  const normal = (x: number, z: number): V3 => {
    const nx = groundAt(x - e, z) - groundAt(x + e, z);
    const nz = groundAt(x, z - e) - groundAt(x, z + e);
    const l = Math.hypot(nx, 2 * e, nz);
    return [nx / l, (2 * e) / l, nz / l];
  };
  // Just under the rig's own ground line, so the pad never fights the substructure.
  const y0 = -0.4;
  g.vert([0, y0, 0], [0, 1, 0], 0);
  for (let k = 1; k < rings.length; k++)
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const x = Math.cos(a) * rings[k], z = Math.sin(a) * rings[k];
      g.vert([x, groundAt(x, z) + y0, z], normal(x, z), 0);
    }
  const at = (k: number, s: number) => (k === 0 ? 0 : 1 + (k - 1) * SEG + (s % SEG));
  for (let s = 0; s < SEG; s++) g.tri(0, at(1, s + 1), at(1, s));
  for (let k = 1; k < rings.length - 1; k++)
    for (let s = 0; s < SEG; s++) {
      g.tri(at(k, s), at(k, s + 1), at(k + 1, s + 1));
      g.tri(at(k, s), at(k + 1, s + 1), at(k + 1, s));
    }
  return g;
}

/**
 * A producing well's Christmas tree on its cellar pad: wellhead, two master
 * valves, the cross with its wing valves, the swab valve and tree cap.
 * Slot 0 is the steel, slot 1 the painted handwheels (KOC blue).
 */
function tree(g: Geo, x: number, z: number, heading: number) {
  // Drawn at 2.4× true size (a tree is ~8 ft): at field distance a true-size
  // tree is a speck, and the point of it is to be read as a producing well.
  const k = 2.4;
  const y = groundAt(x, z);
  const up: V3 = [0, 1, 0];
  const c = Math.cos(heading), s = Math.sin(heading);
  const side: V3 = [c, 0, s];
  const at = (h: number): V3 => [x, y + h * k, z];
  g.box([x, y + 0.25, z], [7 * k, 0, 0], [0, 0.25, 0], [0, 0, 7 * k], 0); // cellar pad
  g.cylinder(at(0.5), up, 1.1 * k, 2.2 * k, 24, 0); // wellhead
  g.cylinder(at(2.7), up, 0.7 * k, 1.4 * k, 20, 0); // lower master valve
  g.cylinder(at(4.1), up, 0.7 * k, 1.4 * k, 20, 0); // upper master valve
  g.cylinder(at(5.5), up, 0.85 * k, 1.3 * k, 20, 0); // the cross
  for (const d of [-1, 1]) {
    const o: V3 = [x + side[0] * 0.85 * k * d, y + 6.15 * k, z + side[2] * 0.85 * k * d];
    g.cylinder(o, [side[0] * d, 0, side[2] * d], 0.45 * k, 2.6 * k, 16, 0); // wing
    g.cylinder([o[0] + side[0] * 1.6 * k * d, y + 6.15 * k, o[2] + side[2] * 1.6 * k * d], up, 0.55 * k, 0.5 * k, 16, 1); // wing handwheel
  }
  g.cylinder(at(6.8), up, 0.6 * k, 1.2 * k, 20, 0); // swab valve
  g.cylinder(at(8.0), up, 0.8 * k, 0.4 * k, 20, 1); // tree cap
  for (const h of [3.4, 4.8]) g.cylinder([x - side[2] * 0.7 * k, y + h * k, z + side[0] * 0.7 * k], [-side[2], 0, side[0]], 0.6 * k, 0.3 * k, 16, 1); // master handwheels
}

/** A flowline laid over the ground from a tree to the station. */
function flowline(g: Geo, a: [number, number], b: [number, number]) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 60));
  let prev: V3 | null = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const p: V3 = [x, groundAt(x, z) + 0.9, z];
    if (prev) {
      const d: V3 = [p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]];
      g.cylinder(prev, d, 0.35, Math.hypot(d[0], d[1], d[2]), 8, 0);
    }
    prev = p;
  }
}

function station(g: Geo) {
  const [sx, sz] = STATION;
  const y = groundAt(sx, sz);
  for (const [dx, dz] of [[-60, -40], [0, -40], [60, -40]]) g.cylinder([sx + dx, y, sz + dz], [0, 1, 0], 22, 30, 48, 0); // tanks
  for (const dz of [30, 46]) g.cylinder([sx - 40, y + 6, sz + dz], [1, 0, 0], 5, 36, 24, 1); // separators
  g.box([sx + 50, y + 7, sz + 40], [16, 0, 0], [0, 7, 0], [0, 0, 10], 0); // control room
  g.box([sx, y + 3, sz + 75], [70, 0, 0], [0, 0.6, 0], [0, 0, 0.6], 0); // header
}

export interface Field {
  terrain: Geo;
  /** Trees, flowlines and the station: slot 0 steel, slot 1 painted. */
  works: Geo;
  /** E's rig, re-placed at each field site. */
  rigs: { box: Record<RigMat, number[]>; cyl: Record<RigMat, number[]>; tubes: Record<RigMat, Geo> };
}

export function buildField(rig: Rig, mats: readonly RigMat[]): Field {
  const works = new Geo();
  const r = rng(7);
  // Producing wells: a few close to the pad, more out across the field.
  // Two producing wells just off the pad, where the opening view can read them.
  const wells: [number, number][] = [[620, -620], [130, -560]];
  const clear = (x: number, z: number) =>
    PADS.every(([px, pz, pr]) => Math.hypot(x - px, z - pz) > pr + 60) && wells.every(([wx, wz]) => Math.hypot(x - wx, z - wz) > 220);
  // The wells by the pad sit on its graded edge.
  let tries = 0;
  while (wells.length < 25 && tries++ < 2000) {
    const a = r() * Math.PI * 2;
    const d = 1000 + Math.pow(r(), 1.4) * 2800;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (clear(x, z)) wells.push([x, z]);
  }
  for (const [x, z] of wells) {
    tree(works, x, z, r() * Math.PI);
    // Only the wells near the station show their flowlines: drawn for every
    // well, the lines crossing the field read as wires, not a field.
    if (Math.hypot(x - STATION[0], z - STATION[1]) < 1300) flowline(works, [x, z], [STATION[0] + (r() - 0.5) * 120, STATION[1] + 75]);
  }
  station(works);

  // Field rigs: each of E's instance matrices, turned and moved to the site.
  const box = Object.fromEntries(mats.map((m) => [m, [] as number[]])) as Record<RigMat, number[]>;
  const cyl = Object.fromEntries(mats.map((m) => [m, [] as number[]])) as Record<RigMat, number[]>;
  const tubes = Object.fromEntries(mats.map((m) => [m, new Geo()])) as Record<RigMat, Geo>;
  for (const [x, z, h] of RIG_SITES) {
    const c = Math.cos(h), s = Math.sin(h);
    const place = new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, x, groundAt(x, z), z, 1]) as M4;
    for (const m of mats) {
      for (const [src, dst] of [[rig.box[m], box[m]], [rig.cyl[m], cyl[m]]] as const)
        for (let i = 0; i < src.length; i += 16) dst.push(...multiply(place, new Float32Array(src.slice(i, i + 16)) as M4));
      // Tubes (hoses, the flow line) are baked in world space: move their vertices.
      const tg = rig.tubes[m];
      const out = tubes[m];
      for (let i = 0; i < tg.count; i++) {
        const px = tg.pos[i * 3], py = tg.pos[i * 3 + 1], pz = tg.pos[i * 3 + 2];
        const nx = tg.nrm[i * 3], ny = tg.nrm[i * 3 + 1], nz = tg.nrm[i * 3 + 2];
        out.vert([c * px + s * pz + x, py + groundAt(x, z), -s * px + c * pz + z], [c * nx + s * nz, ny, -s * nx + c * nz], tg.mat[i]);
      }
      const base = out.count - tg.count;
      for (let i = 0; i < tg.idx.length; i += 3) out.tri(tg.idx[i] + base, tg.idx[i + 1] + base, tg.idx[i + 2] + base);
    }
  }
  return { terrain: terrain(), works, rigs: { box, cyl, tubes } };
}
