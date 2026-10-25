/**
 * The four plates' contents. Every model is F's, built by F's code (models.ts,
 * geometry.ts — copied unchanged); what changes is the ground they stand on.
 *
 * F laid the chapters along one strip of desert and let fog hide each from the
 * next. Here each chapter is cut out as a round plinth (plates.ts): a contoured
 * clay disc, a hatched cut face, and — at the coast — a water layer in section.
 * Anything that runs past the rim (the seawater line, a shrub) is clipped by
 * the renderer, so the plate reads as a specimen, not a window.
 *
 *   I   Bahra, 1936        the first well
 *   II  Burgan, 1938       discovery
 *   III Mina al-Ahmadi     first export, 1946
 *   IV  A rig pad, today   the eight teams as callouts
 */

import { MeshBuilder } from "./geometry";
import { m4, rng, v3, type V3 } from "./math";
import { CENTERS, PAD_Y } from "./anchors";
import { PLATES, plateBase } from "./plates";
import { heightAt } from "./terrain";
import {
  DRILL_PIPE,
  Kit,
  MAT,
  SHRUB,
  UNIT_ANGLE,
  UNIT_ROD,
  combinationRigGear,
  camelMesh,
  coiledTubingUnit,
  container,
  derrick1930s,
  horizontalTank,
  modernRig,
  mudPump,
  mudTank,
  personMesh,
  pickup,
  pipeRack,
  place,
  ridgeTent,
  shaleShaker,
  storageTank,
  tanker,
  truck1930s,
  windsock,
} from "./models";
import { boxAt, cylinder, extrude, lathe } from "./geometry";
import type { DrawItem } from "./renderer";
import type { Anim } from "./anims";

const ft = (x: number) => x * 0.3048;

// ── The plinth ─────────────────────────────────────────────────────────────

/** Item kinds the renderer shades differently. */
export const KIND = { model: 0, ground: 1, water: 2, section: 3, waterSection: 4 } as const;

/**
 * A plate's ground: a polar disc on the height field, its cut face down to the
 * base, and where the ground dips below sea level, the water in section above
 * it. Polar, so the rim is a true circle at any radius.
 */
function plinth(i: number): DrawItem[] {
  const p = PLATES[i];
  const base = plateBase(p);
  const SEG = 360;
  const rings = Math.ceil(p.radius / (p.radius > 80 ? 1.6 : 0.8));
  const at = (r: number, a: number): [number, number] => [p.cx + Math.cos(a) * r, p.cz + Math.sin(a) * r];
  const e = 0.35;
  const normalAt = (x: number, z: number): V3 =>
    v3.norm([heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)]);

  // The surface: ring 0 is the centre point.
  const top = new MeshBuilder();
  top.vert([p.cx, heightAt(p.cx, p.cz), p.cz], normalAt(p.cx, p.cz), [0.9, 0]);
  for (let j = 1; j <= rings; j++)
    for (let s = 0; s < SEG; s++) {
      const [x, z] = at((j / rings) * p.radius, (s / SEG) * Math.PI * 2);
      top.vert([x, heightAt(x, z), z], normalAt(x, z), [0.9, 0]);
    }
  const ring = (j: number, s: number) => (j === 0 ? 0 : 1 + (j - 1) * SEG + (s % SEG));
  for (let s = 0; s < SEG; s++) top.tri(0, ring(1, s + 1), ring(1, s));
  for (let j = 1; j < rings; j++)
    for (let s = 0; s < SEG; s++) {
      top.tri(ring(j, s), ring(j, s + 1), ring(j + 1, s + 1));
      top.tri(ring(j, s), ring(j + 1, s + 1), ring(j + 1, s));
    }

  // The cut face: ground (or seabed) down to the base, and the water above a seabed.
  const cut = new MeshBuilder();
  const sea = new MeshBuilder();
  for (let s = 0; s <= SEG; s++) {
    const a = (s / SEG) * Math.PI * 2;
    const [x, z] = at(p.radius, a);
    const n: V3 = [Math.cos(a), 0, Math.sin(a)];
    const h = heightAt(x, z);
    // tone carries the arc length (for the hatch), accent is unused.
    const arc = a * p.radius;
    cut.vert([x, h, z], n, [arc, 0]);
    cut.vert([x, base, z], n, [arc, 0]);
    sea.vert([x, Math.min(h, 0), z], n, [arc, 0]);
    sea.vert([x, 0, z], n, [arc, 0]);
  }
  for (let s = 0; s < SEG; s++) {
    const q = s * 2;
    cut.tri(q, q + 1, q + 3);
    cut.tri(q, q + 3, q + 2);
    sea.tri(q, q + 1, q + 3);
    sea.tri(q, q + 3, q + 2);
  }
  // The base, facing down: closes the solid for the shadow pass.
  const floor = new MeshBuilder();
  floor.vert([p.cx, base, p.cz], [0, -1, 0], [0, 0]);
  for (let s = 0; s < SEG; s++) {
    const [x, z] = at(p.radius, (s / SEG) * Math.PI * 2);
    floor.vert([x, base, z], [0, -1, 0], [0, 0]);
  }
  for (let s = 0; s < SEG; s++) floor.tri(0, 1 + s, 1 + ((s + 1) % SEG));

  const out: DrawItem[] = [
    { mesh: top.build(), kind: KIND.ground, chapter: i, castShadow: true },
    { mesh: cut.build(), kind: KIND.section, chapter: i, castShadow: true },
    { mesh: floor.build(), kind: KIND.section, chapter: i, castShadow: true },
  ];
  if (plateHasSea(i)) {
    out.push({ mesh: sea.build(), kind: KIND.waterSection, chapter: i, castShadow: false });
    // The sea surface: one disc at y = 0, drawn translucent over the seabed.
    const w = new MeshBuilder();
    w.vert([p.cx, 0, p.cz], [0, 1, 0], [0, 0]);
    for (let s = 0; s < SEG; s++) {
      const [x, z] = at(p.radius, (s / SEG) * Math.PI * 2);
      w.vert([x, 0, z], [0, 1, 0], [0, 0]);
    }
    for (let s = 0; s < SEG; s++) w.tri(0, 1 + ((s + 1) % SEG), 1 + s);
    out.push({ mesh: w.build(), kind: KIND.water, chapter: i, castShadow: false });
  }
  return out;
}

const plateHasSea = (i: number) => i === 2;

// ── Chapter builders ───────────────────────────────────────────────────────

const groundAt = (x: number, z: number) => heightAt(x, z);

function finish(k: Kit, chapter: number, extra: DrawItem[] = []): DrawItem[] {
  const out: DrawItem[] = [{ mesh: k.s.build(), chapter, castShadow: true }];
  if (k.members.length)
    out.push({ mesh: UNIT_ANGLE, instances: new Float32Array(k.members), instMat: MAT.steel, chapter, castShadow: true });
  if (k.rods.length)
    out.push({ mesh: UNIT_ROD, instances: new Float32Array(k.rods), instMat: MAT.steel, chapter, castShadow: true });
  return out.concat(plinth(chapter), extra);
}

/** Desert scrub, scattered over the plate only — nothing grows past the rim. */
function shrubs(ch: number, n: number, seed: number, avoid: (x: number, z: number) => boolean): DrawItem {
  const p = PLATES[ch];
  const r = rng(seed);
  const inst: number[] = [];
  let tries = 0;
  while (inst.length / 16 < n && tries++ < n * 20) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (p.radius - 1.5);
    const x = p.cx + Math.cos(a) * d;
    const z = p.cz + Math.sin(a) * d;
    if (avoid(x, z)) continue;
    const y = heightAt(x, z);
    if (y < 0.4 && ch === 2) continue;
    const s = 0.45 + r() * 0.8;
    inst.push(...m4.compose(m4.translation(x, y - 0.05, z), m4.rotY(r() * 6.28), m4.scaling(s, s * (0.6 + r() * 0.4), s)));
  }
  return { mesh: SHRUB, instances: new Float32Array(inst), instMat: [0.5, 0.05], chapter: ch, castShadow: true };
}

/** I · Bahra, 1936 — the first well, and the survey party that sited it. */
function chapterI(): DrawItem[] {
  const c = CENTERS[0];
  const k = new Kit();
  const y = groundAt(c[0], c[2]);
  derrick1930s(k, [c[0], y, c[2]], { height: ft(122), base: ft(24), top: ft(5.5), panels: 13, floor: 2.3, rot: 0.35, rigged: true });
  combinationRigGear(k, [c[0], y, c[2]], 0.35, 2.3, ft(24) / 2 + 1.3);
  // Camp.
  for (let t = 0; t < 3; t++) {
    const x = c[0] + 18 + t * 6.5, z = c[2] + 14 - t * 2;
    ridgeTent(k, [x, groundAt(x, z), z], 0.2 + t * 0.05);
  }
  const tx = c[0] + 8, tz = c[2] + 20;
  truck1930s(k, [tx, groundAt(tx, tz), tz], -0.5, "barrels");
  // Camels and the party.
  const cam: [number, number, number, "stand" | "couch", boolean][] = [
    [-14, 22, 0.8, "stand", true],
    [-10, 25, 0.95, "stand", false],
    [-17, 17, 1.4, "couch", false],
  ];
  for (const [dx, dz, r, pose, load] of cam) place(k, camelMesh(pose, load), [c[0] + dx, groundAt(c[0] + dx, c[2] + dz), c[2] + dz], r);
  const ppl: [number, number, number][] = [[-11.5, 21, 2.4], [-8, 16, -0.4], [4, 17, 2.0], [5, 18.2, -2.6], [-2, 9, 1.2]];
  for (const [dx, dz, r] of ppl) place(k, personMesh("robe", dx === 4 ? "gesture" : "down"), [c[0] + dx, groundAt(c[0] + dx, c[2] + dz), c[2] + dz], r);
  // Surveyor's theodolite on its tripod.
  const sx = c[0] - 4, sz = c[2] + 24, sy = groundAt(sx, sz);
  for (let l = 0; l < 3; l++) {
    const a = (l / 3) * Math.PI * 2;
    k.rod([sx + Math.cos(a) * 0.5, sy, sz + Math.sin(a) * 0.5], [sx, sy + 1.4, sz], 0.03);
  }
  boxAt(k.s, [sx, sy + 1.55, sz], [0.18, 0.22, 0.14], MAT.dark);
  place(k, personMesh("robe", "gesture"), [sx - 0.7, sy, sz + 0.2], 0.2);
  const near = (x: number, z: number) => Math.hypot(x - c[0], z - c[2]) < 9 || Math.hypot(x - c[0], z - c[2] - 18) < 14;
  return finish(k, 0, [shrubs(0, 90, 11, near)]);
}

/** II · Burgan No. 1, 1938. */
function chapterII(): DrawItem[] {
  const c = CENTERS[1];
  const k = new Kit();
  const pipes: number[] = [];
  const y = groundAt(c[0], c[2]);
  derrick1930s(k, [c[0], y, c[2]], { height: ft(122), base: ft(24), top: ft(5.5), panels: 13, floor: 2.4, rot: -0.25, rigged: true });
  // The same combination rig, moved from Bahra.
  combinationRigGear(k, [c[0], y, c[2]], -0.25, 2.4, ft(24) / 2 + 1.3);
  // Drilling water was seawater piped from the coast: a water tank and its line.
  const wx = c[0] - 30, wz = c[2] + 6;
  storageTank(k, [wx, groundAt(wx, wz), wz], 5.2, 4.4, 0.9, MAT.steelLight);
  k.rod([wx - 2.6, groundAt(wx - 3, wz) + 0.3, wz], [wx - 120, groundAt(wx - 120, wz - 10) + 0.3, wz - 10], 0.1);
  // Stock tanks.
  const t1: V3 = [c[0] + 18, 0, c[2] - 14];
  storageTank(k, [t1[0], groundAt(t1[0], t1[2]), t1[2]], 9.5, 5.2, 0.4);
  const t2: V3 = [c[0] + 29, 0, c[2] - 6];
  storageTank(k, [t2[0], groundAt(t2[0], t2[2]), t2[2]], 6.6, 4.9, 1.2);
  // Flow line from the well to the tanks.
  k.rod([c[0] + 3, y + 0.4, c[2] - 2], [t1[0] - 4.8, groundAt(t1[0] - 5, t1[2]) + 0.4, t1[2] + 1], 0.11);
  // Pipe rack by the V-door.
  const px = c[0] + 12, pz = c[2] + 8;
  pipeRack(k, [px, groundAt(px, pz), pz], -0.25, 9, 3, pipes);
  const tx = c[0] + 22, tz = c[2] + 14;
  truck1930s(k, [tx, groundAt(tx, tz), tz], 2.6, "pipe");
  for (let t = 0; t < 2; t++) {
    const x = c[0] - 26 + t * 7, z = c[2] + 16 + t;
    ridgeTent(k, [x, groundAt(x, z), z], -0.1);
  }
  const cam: [number, number, number, "stand" | "couch", boolean][] = [
    [-22, 26, 0.25, "stand", true],
    [-13, 30, 1.9, "couch", false],
  ];
  for (const [dx, dz, r, pose, load] of cam) place(k, camelMesh(pose, load), [c[0] + dx, groundAt(c[0] + dx, c[2] + dz), c[2] + dz], r);
  const ppl: [number, number, number, "robe" | "worker"][] = [
    [6, 5, 2.2, "robe"], [7.2, 4, -1.8, "robe"], [-4, 7.5, 0.4, "robe"], [15, 14, 3.0, "robe"], [-19, 24, 0.5, "robe"],
  ];
  for (const [dx, dz, r, kind] of ppl) place(k, personMesh(kind), [c[0] + dx, groundAt(c[0] + dx, c[2] + dz), c[2] + dz], r);
  const near = (x: number, z: number) =>
    Math.hypot(x - c[0], z - c[2]) < 10 || Math.hypot(x - c[0] - 22, z - c[2] + 10) < 12 || Math.hypot(x - c[0] + 18, z - c[2] - 26) < 10;
  return finish(k, 1, [
    { mesh: DRILL_PIPE, instances: new Float32Array(pipes), chapter: 1, castShadow: true },
    shrubs(1, 90, 23, near),
  ]);
}

/**
 * III · 30 June 1946 — the first cargo. Four tanks on a hilltop above the
 * coast gravity-fed submarine lines to an offshore berth (The Oil Weekly,
 * 20 May 1946); there was no pier yet. The tanker lies offshore.
 */
function chapterIII(): DrawItem[] {
  const c = CENTERS[2];
  const k = new Kit();
  // Four tanks of 139,200 bbl each: ~44 m across, ~14.6 m (48 ft) high.
  const tanks: V3[] = [[-75, 0, -76], [-25, 0, -80], [25, 0, -80], [75, 0, -76]];
  for (const t of tanks) storageTank(k, [c[0] + t[0], groundAt(c[0] + t[0], c[2] + t[2]), c[2] + t[2]], 44, 14.6, 0.3);
  // Manifold at the crest, where the ceremony stands.
  const mx = c[0] + 2, mz = c[2] - 44, my = groundAt(mx, mz);
  boxAt(k.s, [mx, my + 0.35, mz], [6, 0.7, 2.6], MAT.steel);
  for (const dx of [-1.6, 0, 1.6]) k.rod([mx + dx, my + 0.7, mz], [mx + dx, my + 1.3, mz], 0.24);
  // Header from each tank to the manifold.
  for (const t of tanks) {
    const tx = c[0] + t[0], tz = c[2] + t[2] + 22;
    k.rod([tx, groundAt(tx, tz) + 0.5, tz], [mx, my + 0.5, mz - 1], 0.3);
  }
  // The silver wheel on the loading valve.
  const vy = my + 1.95;
  cylinder(k.s, 0.18, 1.3, 48, m4.translation(mx, my + 0.7, mz + 1.4), MAT.steel);
  lathe(k.s, [[0.45, -0.03], [0.5, 0], [0.45, 0.03]], 128, m4.compose(m4.translation(mx, vy, mz + 1.4), m4.rotX(Math.PI / 2)), MAT.white);
  for (let s2 = 0; s2 < 6; s2++) {
    const a = (s2 / 6) * Math.PI * 2;
    k.rod([mx, vy, mz + 1.4], [mx + Math.cos(a) * 0.47, vy + Math.sin(a) * 0.47, mz + 1.4], 0.04);
  }
  // Two submarine lines: down the slope, across the beach, under the sea to the hose buoy.
  const hoseZ = c[2] + 44;
  for (let l = 0; l < 2; l++) {
    const x = mx - 0.6 + l * 1.2;
    let prev: V3 | null = null;
    for (let s2 = 0; s2 <= 40; s2++) {
      const z = mz + 1 + (s2 / 40) * (hoseZ - mz - 1);
      const p: V3 = [x, heightAt(x, z) + 0.35, z];
      if (prev) k.rod(prev, p, 0.36);
      prev = p;
    }
  }
  // The berth, pulled in from F's 150 m so the whole scene fits one plate:
  // the tanker lies parallel to the shore, between two mooring buoys, with
  // the hose buoy on the shore side.
  const hullC: V3 = [c[0] - 5, 0, c[2] + 66];
  for (const [dx, dz, koc] of [[-74, 10, false], [74, 10, false], [mx - c[0], hoseZ - c[2], true]] as const) {
    const x = (dx === mx - c[0] ? c[0] : hullC[0]) + dx, z = (dx === mx - c[0] ? c[2] : hullC[2]) + dz;
    lathe(k.s, [[0, -0.6], [1.1, -0.4], [1.3, 0.4], [1.0, 0.9], [0, 1.0]], 48, m4.translation(x, 0, z), koc ? MAT.kocLight : MAT.white);
  }
  tanker(k, [hullC[0] - 70, 0, hullC[2]], 0, 140, 18.3, 10.4, 7.6);
  // The party on the crest.
  const ppl: [number, number, number, "down" | "gesture"][] = [
    [-0.8, -41.8, 1.3, "gesture"], [0.6, -40.6, 0.7, "down"], [-2.2, -40.2, 1.1, "down"], [-3.4, -42, 1.2, "down"],
    [3.6, -40.5, 2.2, "down"], [4.6, -41.8, 2.4, "down"], [-4.8, -39.5, 0.9, "down"], [2.2, -39.2, 1.8, "down"],
  ];
  for (const [dx, dz, r, a] of ppl) place(k, personMesh("robe", a), [c[0] + dx, groundAt(c[0] + dx, c[2] + dz), c[2] + dz], r);
  const tx = c[0] - 16, tz = c[2] - 50;
  truck1930s(k, [tx, groundAt(tx, tz), tz], 1.2, "none");
  // Ahmadi, begun that year: the first bungalows going up behind the tanks.
  for (let h = 0; h < 5; h++) {
    const hx = c[0] - 52 + h * 26, hz = c[2] - 112 - (h % 2) * 6;
    const hy = groundAt(hx, hz);
    boxAt(k.s, [hx, hy + 1.6, hz], [10, 3.2, 8], MAT.white, 0.05);
    extrude(k.s, [[-5.4, 0], [5.4, 0], [0, 2.2]], 8.8, m4.compose(m4.translation(hx, hy + 3.2, hz - 4.4), m4.rotY(0.05)), MAT.paint);
  }
  const clear = (x: number, z: number) =>
    Math.abs(x - mx) < 5 || z > c[2] + 14 || (z < c[2] - 50 && z > c[2] - 104) || (z < c[2] - 106 && Math.abs(x - c[0]) < 62);
  return finish(k, 2, [shrubs(2, 90, 31, clear)]);
}

/** IV · a rig pad today. The eight teams are its callouts. */
function chapterIV(): DrawItem[] {
  const c = CENTERS[3];
  const k = new Kit();
  const pipes: number[] = [];
  const y = PAD_Y;
  const rigRot = 0;
  const rig = modernRig(k, [c[0], y, c[2]], rigRot, pipes);
  // Mud system behind the rig (−x), power beyond it.
  for (let t = 0; t < 3; t++) mudTank(k, [c[0] - 14, y, c[2] - 12 + t * 3.4 - 3.4], 0);
  shaleShaker(k, [c[0] - 6, y, c[2] - 8.5], 0);
  shaleShaker(k, [c[0] - 6, y, c[2] - 11.5], 0);
  mudPump(k, [c[0] - 26, y, c[2] + 2], 0);
  mudPump(k, [c[0] - 26, y, c[2] + 6], 0);
  for (let g = 0; g < 3; g++) container(k, [c[0] - 38, y, c[2] - 10 + g * 3.4], 12.2, 2.44, 2.9, 0, MAT.white);
  horizontalTank(k, [c[0] - 38, y, c[2] + 8], 3.0, 12, 0, MAT.paint);
  horizontalTank(k, [c[0] - 38, y, c[2] + 13], 3.0, 12, 0, MAT.white);
  // Pipe racks and catwalk side.
  pipeRack(k, [c[0] + 22, y, c[2] - 6], 0, 16, 4, pipes);
  pipeRack(k, [c[0] + 22, y, c[2] + 6], 0, 16, 3, pipes);
  // Camp: accommodation caravans in a row.
  for (let v = 0; v < 6; v++) container(k, [c[0] + 44 - v * 13.5, y, c[2] - 50], 12, 3.2, 3.0, 0, MAT.white);
  // Company office caravan (EN01's hotspot).
  container(k, [c[0] + 46, y, c[2] - 34], 12, 3.2, 3.0, Math.PI / 2, MAT.kocLight);
  // Water tank and supply truck (operational support).
  storageTank(k, [c[0] - 46, y, c[2] + 34], 7, 5.5, 0, MAT.white);
  pickup(k, [c[0] + 36, y, c[2] + 26], 2.4);
  pickup(k, [c[0] + 44, y, c[2] + 22], 2.2);
  // Coiled tubing unit (well intervention), parked by the pad edge.
  coiledTubingUnit(k, [c[0] + 18, y, c[2] + 36], 0.1);
  // Flare pit berm, downwind.
  boxAt(k.s, [c[0] - 58, y + 0.9, c[2] - 42], [14, 1.8, 1.2], MAT.mud, 0.3);
  // Muster point sign (HSE).
  k.rod([c[0] - 13, y, c[2] + 47], [c[0] - 13, y + 2.4, c[2] + 47], 0.1);
  boxAt(k.s, [c[0] - 13, y + 2.6, c[2] + 47], [1.4, 0.9, 0.08], MAT.kocLight, -0.6);
  // Workers.
  const ppl: [number, number, number][] = [[6, 3, 1.2], [9, -2, 2.8], [-6, -5, 0.4], [20, 1, 1.6], [16, 34, 2.2], [40, 20, 3.1], [-20, -9, 0.6]];
  for (const [dx, dz, r] of ppl) {
    const yy = dx > -8 && dx < 8 && dz > -5 && dz < 5 ? y + rig.floorY + 0.18 : y;
    place(k, personMesh("worker"), [c[0] + dx, yy, c[2] + dz], r);
  }
  const ws = windsock([c[0] - 16, y, c[2] + 44]);

  // Animated parts travel as descriptors (see anims.ts): the build may run in a worker.
  const block: Anim = { kind: "block", a: [...rig.blockBase, rig.mastTop] };
  const sock: Anim = { kind: "sock", a: ws.top };

  return finish(k, 3, [
    { mesh: DRILL_PIPE, instances: new Float32Array(pipes), chapter: 3, castShadow: true },
    { mesh: rig.block, chapter: 3, castShadow: true, anim: block },
    { mesh: rig.lines, chapter: 3, castShadow: true, anim: { ...block, kind: "lines" } },
    { mesh: ws.pole, chapter: 3, castShadow: true },
    { mesh: ws.sock, chapter: 3, castShadow: true, anim: sock },
  ]);
}

/** Built in reading order: the story opens at chapter I. */
export const BUILD_ORDER = [0, 1, 2, 3];
export const BUILDERS = [chapterI, chapterII, chapterIII, chapterIV];
