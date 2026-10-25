/**
 * Kuwait as a clay slab for "The fields": the national outline extruded, a
 * graticule on its top, and each field raised as a low dome with contours —
 * the anticline the field is, drawn at map scale.
 *
 * The outline is world-geojson's Kuwait (github.com/georgique/world-geojson,
 * countries/kuwait.json), the mainland and Failaka; the small islets are left
 * out. Field positions and sizes are approximate (see ../content.ts for the
 * sources); the map is schematic and says so on the page.
 */

import { Geo } from "./geometry";
import { type V3 } from "./math";

/** World units per degree of latitude. */
export const K = 30000;
const LON0 = 47.65;
const LAT0 = 29.3;
const COS = Math.cos((LAT0 * Math.PI) / 180);

/** lon/lat → world x/z. North is −z, so a camera south of the map reads it upright. */
export const toWorld = (lon: number, lat: number): [number, number] => [(lon - LON0) * K * COS, -(lat - LAT0) * K];

/** Slab thickness and the height a field dome rises to. */
export const SLAB = 1600;
export const DOME_H = 520;

export const MAINLAND: [number, number][] = [
  [47.709274, 30.103765], [47.371674, 30.102366], [47.279663, 30.057208], [47.17392, 30.025111],
  [47.121735, 29.956124], [47.015991, 29.730992], [46.998138, 29.661803], [46.910248, 29.523281],
  [46.847076, 29.413283], [46.783246, 29.353937], [46.766032, 29.321234], [46.703085, 29.250774],
  [46.668366, 29.20543], [46.626836, 29.168363], [46.582874, 29.138093], [46.557399, 29.103149],
  [46.553192, 29.101777], [47.466433, 29.000076], [47.497801, 28.965157], [47.514838, 28.929794],
  [47.542518, 28.898579], [47.565584, 28.860972], [47.58811, 28.836666], [47.595913, 28.795157],
  [47.600431, 28.758099], [47.594347, 28.726545], [47.59636, 28.687447], [47.605789, 28.655063],
  [47.639195, 28.629792], [47.653984, 28.595739], [47.708723, 28.543202], [47.704364, 28.524474],
  [47.89272, 28.527329], [48.026733, 28.510936], [48.101972, 28.530537], [48.442169, 28.535068],
  [48.429108, 28.57608], [48.420868, 28.639979], [48.415375, 28.705043], [48.419686, 28.758907],
  [48.35083, 28.768863], [48.305511, 28.827832], [48.297272, 28.896386], [48.251953, 28.919227],
  [48.177795, 29.032158], [48.140717, 29.178543], [48.114624, 29.363027], [48.059692, 29.383372],
  [47.988281, 29.414479], [47.942963, 29.380978], [47.881165, 29.40132], [47.801514, 29.40132],
  [47.801514, 29.430029], [47.923737, 29.520891], [48.013, 29.553151], [48.080292, 29.545983],
  [48.148956, 29.492206], [48.190155, 29.53523], [48.2341, 29.568679], [48.300018, 29.610476],
  [48.352203, 29.647482], [48.389282, 29.698789], [48.404388, 29.752455], [48.424988, 29.8466],
  [48.161316, 30.027489], [48.043213, 30.022733], [48.013397, 29.990108], [47.840729, 30.053444],
];

export const FAILAKA: [number, number][] = [
  [48.317184, 29.478459], [48.294525, 29.476666], [48.278046, 29.469492], [48.261566, 29.435412],
  [48.264999, 29.422853], [48.289719, 29.427039], [48.334351, 29.422853], [48.343277, 29.408498],
  [48.378296, 29.389953], [48.401642, 29.389355], [48.408508, 29.405507], [48.402328, 29.413283],
  [48.383789, 29.432422], [48.365936, 29.45335], [48.347397, 29.460525], [48.321991, 29.46471],
];

export type Region = "north" | "west" | "south";
/** Each region draws with its own material slot, so a stop can pick one out. */
export const REGION_SLOT: Record<Region, number> = { north: 0, west: 1, south: 2 };

export interface FieldDef {
  name: string;
  region: Region;
  /** Centre, lon/lat. */
  at: [number, number];
  /** Semi-axes, km, and the long axis' bearing from north, degrees. */
  axes: [number, number];
  bearing: number;
  /** The label's side, so neighbours do not collide. */
  side?: "left" | "right" | "below";
}

/**
 * Centres from Global Energy Monitor and Wikipedia (they disagree by 1–4 km),
 * nudged apart where two would sit on top of each other. Sizes are
 * approximate. The map says it is schematic.
 */
export const FIELDS: FieldDef[] = [
  { name: "Raudhatain", region: "north", at: [47.72, 29.93], axes: [9, 5], bearing: 10, side: "left" },
  { name: "Sabriyah", region: "north", at: [47.87, 29.8], axes: [8, 4.5], bearing: 15 },
  { name: "Bahra", region: "north", at: [47.92, 29.64], axes: [5, 3], bearing: 20 },
  { name: "Ratqa", region: "north", at: [47.42, 29.89], axes: [7, 3], bearing: 0, side: "below" },
  { name: "Mutriba", region: "north", at: [47.28, 29.9], axes: [5, 3], bearing: 0, side: "left" },
  { name: "Minagish", region: "west", at: [47.55, 29.02], axes: [9, 5], bearing: 160, side: "left" },
  { name: "Umm Gudair", region: "west", at: [47.72, 28.86], axes: [8, 4.5], bearing: 170, side: "left" },
  { name: "Abduliyah", region: "west", at: [47.69, 29.08], axes: [4, 2.5], bearing: 0, side: "left" },
  { name: "Dharif", region: "west", at: [47.76, 29.21], axes: [4, 2.5], bearing: 0, side: "left" },
  // Greater Burgan: one NNE–SSW anticline, three domes (GeoExpro): Burgan
  // ~500 km², Magwa 186 km², Ahmadi 144 km².
  { name: "Burgan", region: "south", at: [47.96, 28.93], axes: [14, 11], bearing: 20 },
  { name: "Magwa", region: "south", at: [47.93, 29.14], axes: [9, 6.5], bearing: 20, side: "left" },
  { name: "Ahmadi", region: "south", at: [48.06, 29.09], axes: [8, 5.7], bearing: 20 },
];

/** Places that are not fields, for orientation. */
export const PLACES: { name: string; at: [number, number] }[] = [
  { name: "Kuwait City", at: [47.98, 29.37] },
  { name: "Kuwait Bay", at: [47.9, 29.47] },
];

/** A field's dome height at a world point, 0..DOME_H. Mirrors the mesh. */
function fieldShape(f: FieldDef) {
  const [cx, cz] = toWorld(f.at[0], f.at[1]);
  const a = (f.axes[0] / 111) * K;
  const b = (f.axes[1] / 111) * K;
  const t = (f.bearing * Math.PI) / 180;
  return { cx, cz, a, b, c: Math.cos(t), s: Math.sin(t) };
}

/** Where a field's label points: the top of its dome. */
export function fieldAnchor(f: FieldDef): V3 {
  const [x, z] = toWorld(f.at[0], f.at[1]);
  return [x, DOME_H, z];
}

export function placeAnchor(at: [number, number]): V3 {
  const [x, z] = toWorld(at[0], at[1]);
  return [x, 0, z];
}

/* ------------------------------------------------------------------------ */

/** Ear-clipping triangulation of a simple polygon (counter-clockwise or not). */
function triangulate(pts: [number, number][]): number[] {
  const n = pts.length;
  const area = pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % n];
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0);
  const idx = Array.from({ length: n }, (_, i) => i);
  if (area < 0) idx.reverse();
  const out: number[] = [];
  const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: number[], a: number[], b: number[], c: number[]) =>
    cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length];
      const i1 = idx[i];
      const i2 = idx[(i + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cross(a, b, c) <= 0) continue;
      let ear = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inside(pts[j], a, b, c)) {
          ear = false;
          break;
        }
      }
      if (!ear) continue;
      out.push(i0, i1, i2);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}

/** One landmass: a flat top and walls down to the slab's foot. */
function slab(g: Geo, ring: [number, number][]) {
  const w = ring.map(([lon, lat]) => toWorld(lon, lat));
  // Triangulate in (x, −z) so the winding matches the lon/lat sense.
  const tris = triangulate(w.map(([x, z]) => [x, -z]));
  const base = g.count;
  for (const [x, z] of w) g.vert([x, 0, z], [0, 1, 0], 0);
  for (let i = 0; i < tris.length; i += 3) g.tri(base + tris[i], base + tris[i + 1], base + tris[i + 2]);
  for (let i = 0; i < w.length; i++) {
    const [x0, z0] = w[i];
    const [x1, z1] = w[(i + 1) % w.length];
    const dx = x1 - x0, dz = z1 - z0;
    const l = Math.hypot(dx, dz) || 1;
    const n: V3 = [dz / l, 0, -dx / l];
    const a = g.vert([x0, 0, z0], n, 1);
    const b = g.vert([x1, 0, z1], n, 1);
    const c = g.vert([x1, -SLAB, z1], n, 1);
    const d = g.vert([x0, -SLAB, z0], n, 1);
    g.tri(a, b, c);
    g.tri(a, c, d);
  }
}

export function buildKuwait(): Geo {
  const g = new Geo();
  slab(g, MAINLAND);
  slab(g, FAILAKA);
  return g;
}

/** Every field's dome, one mesh: polar grids on ellipses, height (1 − r²)². */
export function buildFields(): { geo: Geo; index: number[] } {
  const g = new Geo();
  const index: number[] = [];
  const RINGS = 18;
  const SEGS = 48;
  FIELDS.forEach((f, fi) => {
    const { cx, cz, a, b, c, s } = fieldShape(f);
    const at = (r: number, t: number): V3 => {
      // Along the long axis (bearing from north) and across it; north is −z.
      const along = Math.cos(t) * a * r;
      const across = Math.sin(t) * b * r;
      const east = along * s + across * c;
      const north = along * c - across * s;
      const h = DOME_H * Math.pow(1 - r * r, 2) + 24;
      return [cx + east, h, cz - north];
    };
    const start = g.count;
    for (let i = 0; i <= RINGS; i++)
      for (let k = 0; k < SEGS; k++) {
        const r = i / RINGS;
        const t = (k / SEGS) * Math.PI * 2;
        const p = at(r, t);
        // Normal by finite differences.
        // Backward at the rim, where a step outward would leave the dome.
        const e = 0.01;
        const pr = r + e <= 1 ? at(r + e, t) : at(r - e, t);
        const pt = at(r, t + e);
        const sgn = r + e <= 1 ? 1 : -1;
        const u: V3 = [(pr[0] - p[0]) * sgn, (pr[1] - p[1]) * sgn, (pr[2] - p[2]) * sgn];
        const v: V3 = [pt[0] - p[0], pt[1] - p[1], pt[2] - p[2]];
        let n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (r < 1e-6 || n[1] < 0) n = r < 1e-6 ? [0, 1, 0] : [-n[0], -n[1], -n[2]];
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        g.vert(p, [n[0] / l, n[1] / l, n[2] / l], REGION_SLOT[f.region]);
        index.push(fi);
      }
    for (let i = 0; i < RINGS; i++)
      for (let k = 0; k < SEGS; k++) {
        const k1 = (k + 1) % SEGS;
        const a0 = start + i * SEGS + k, a1 = start + i * SEGS + k1;
        const b0 = start + (i + 1) * SEGS + k, b1 = start + (i + 1) * SEGS + k1;
        g.tri(a0, b0, b1);
        g.tri(a0, b1, a1);
      }
  });
  return { geo: g, index };
}
