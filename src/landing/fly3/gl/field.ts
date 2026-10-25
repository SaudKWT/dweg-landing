/**
 * What the flyover passes over: an oil field with no edge.
 *
 * The meshes are F·E·I's (fei3): E's 2,000 hp rig, a Christmas tree on its
 * a gathering station. Each is baked once into a single mesh with
 * a material slot per vertex, then drawn instanced.
 *
 * Where they stand is decided cell by cell from a hash of the cell's
 * coordinates, so the field is infinite and the same every time you pass a
 * spot: no tile repeats, nothing is stored. Units: ft, y up.
 */

import { Geo } from "./geometry";
import { type V3 } from "./math";
import { RIG_MATS, buildRig, type RigMat } from "./rig";

/** Material slots, read by the shader: clay, steel, ink, KOC blue. */
export const SLOT = { clay: 0, steel: 1, ink: 2, accent: 3 } as const;

const RIG_SLOT: Record<RigMat, number> = {
  struct: SLOT.clay,
  accent: SLOT.accent,
  steel: SLOT.steel,
  dark: SLOT.ink,
  glass: SLOT.ink,
  cable: SLOT.steel,
};

/** Apply a column-major instance matrix to a unit mesh and append it, normals by the inverse-transpose of a scaled basis. */
function bake(out: Geo, unit: Geo, m: ArrayLike<number>, slot: number) {
  const c0: V3 = [m[0], m[1], m[2]], c1: V3 = [m[4], m[5], m[6]], c2: V3 = [m[8], m[9], m[10]];
  const s0 = c0[0] ** 2 + c0[1] ** 2 + c0[2] ** 2 || 1;
  const s1 = c1[0] ** 2 + c1[1] ** 2 + c1[2] ** 2 || 1;
  const s2 = c2[0] ** 2 + c2[1] ** 2 + c2[2] ** 2 || 1;
  const base = out.count;
  for (let i = 0; i < unit.count; i++) {
    const x = unit.pos[i * 3], y = unit.pos[i * 3 + 1], z = unit.pos[i * 3 + 2];
    const nx = unit.nrm[i * 3] / s0, ny = unit.nrm[i * 3 + 1] / s1, nz = unit.nrm[i * 3 + 2] / s2;
    const p: V3 = [c0[0] * x + c1[0] * y + c2[0] * z + m[12], c0[1] * x + c1[1] * y + c2[1] * z + m[13], c0[2] * x + c1[2] * y + c2[2] * z + m[14]];
    const n: V3 = [c0[0] * nx + c1[0] * ny + c2[0] * nz, c0[1] * nx + c1[1] * ny + c2[1] * nz, c0[2] * nx + c1[2] * ny + c2[2] * nz];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    out.vert(p, [n[0] / l, n[1] / l, n[2] / l], slot);
  }
  for (const i of unit.idx) out.idx.push(i + base);
}

/** E's rig as one mesh, standing on y = 0 with the well at the origin. */
export function rigMesh(): Geo {
  const rig = buildRig();
  const out = new Geo();
  const box = new Geo().box([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0);
  const cyl = new Geo().cylinder([0, 0, 0], [0, 1, 0], 1, 1, 12, 0);
  for (const m of RIG_MATS) {
    const slot = RIG_SLOT[m];
    for (let i = 0; i < rig.box[m].length; i += 16) bake(out, box, rig.box[m].slice(i, i + 16), slot);
    for (let i = 0; i < rig.cyl[m].length; i += 16) bake(out, cyl, rig.cyl[m].slice(i, i + 16), slot);
    const t = rig.tubes[m];
    if (t.count) bake(out, t, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], slot);
  }
  return out;
}

/**
 * A producing well's Christmas tree, standing straight on the ground (no pad), drawn at
 * 3.6× true size: from the flight's height a true-size tree is a speck.
 */
export function treeMesh(): Geo {
  const g = new Geo();
  const k = 3.6;
  const up: V3 = [0, 1, 0];
  const at = (h: number): V3 => [0, h * k, 0];
  const steel = SLOT.steel, blue = SLOT.accent;
  g.cylinder(at(0.5), up, 1.1 * k, 2.2 * k, 20, steel);
  g.cylinder(at(2.7), up, 0.7 * k, 1.4 * k, 16, steel);
  g.cylinder(at(4.1), up, 0.7 * k, 1.4 * k, 16, steel);
  g.cylinder(at(5.5), up, 0.85 * k, 1.3 * k, 16, steel);
  for (const d of [-1, 1]) {
    g.cylinder([0.85 * k * d, 6.15 * k, 0], [d, 0, 0], 0.45 * k, 2.6 * k, 12, steel);
    g.cylinder([2.45 * k * d, 6.15 * k, 0], up, 0.55 * k, 0.5 * k, 12, blue);
  }
  g.cylinder(at(6.8), up, 0.6 * k, 1.2 * k, 16, steel);
  g.cylinder(at(8.0), up, 0.8 * k, 0.4 * k, 16, blue);
  for (const h of [3.4, 4.8]) g.cylinder([0, h * k, 0.7 * k], [0, 0, 1], 0.6 * k, 0.3 * k, 12, blue);
  return g;
}

/** A gathering station: three tanks, two separators, a control room, the inlet header. */
export function stationMesh(): Geo {
  const g = new Geo();
  for (const dx of [-60, 0, 60]) g.cylinder([dx, 0, -40], [0, 1, 0], 22, 30, 40, SLOT.clay);
  for (const dz of [30, 46]) g.cylinder([-58, 6, dz], [1, 0, 0], 5, 36, 20, SLOT.accent);
  g.box([50, 7, 40], [16, 0, 0], [0, 7, 0], [0, 0, 10], SLOT.clay);
  g.box([0, 3, 75], [70, 0, 0], [0, 0.6, 0], [0, 0, 0.6], SLOT.steel);
  g.box([0, 0.3, 0], [110, 0, 0], [0, 0.3, 0], [0, 0, 110], SLOT.clay);
  return g;
}

/** Side of one placement cell, ft. */
export const CELL = 560;

function hash(i: number, j: number, salt: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Kind = "rig" | "tree" | "station";

/** What stands in cell (i, j), if anything: kind, world x, z and heading. Pure: the same cell always answers the same. */
export function cellContent(i: number, j: number): { kind: Kind; x: number; z: number; h: number }[] {
  const out: { kind: Kind; x: number; z: number; h: number }[] = [];
  const r = hash(i, j, 1);
  const px = (i + 0.15 + 0.7 * hash(i, j, 2)) * CELL;
  const pz = (j + 0.15 + 0.7 * hash(i, j, 3)) * CELL;
  const h = hash(i, j, 4) * Math.PI * 2;
  if (r < 0.15) out.push({ kind: "rig", x: px, z: pz, h });
  else if (r < 0.18) out.push({ kind: "station", x: px, z: pz, h });
  else if (r < 0.62) out.push({ kind: "tree", x: px, z: pz, h });
  // A few more producing wells fill in around everything else,
  // kept to the cell's margin so they never stand on a rig or a station.
  for (let w = 0; w < 2; w++)
    if (hash(i, j, 5 + w) < 0.16) {
      const side = hash(i, j, 8 + w) < 0.5;
      const along = 0.05 + 0.9 * hash(i, j, 10 + w);
      out.push({ kind: "tree", x: (i + (side ? along : 0.04)) * CELL, z: (j + (side ? 0.04 : along)) * CELL, h: h + w + 1 });
    }
  return out;
}
