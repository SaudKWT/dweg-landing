/**
 * The block diagram for "Beneath Kuwait": a generalised Kuwait column folded
 * over a Burgan-type anticline, drawn the way a geology plate draws one — a
 * block cut out of the ground, layers on its faces in lithology patterns, oil
 * in the reservoir sands under the crest.
 *
 * ILLUSTRATIVE. The ORDER of the formations, their lithology and their role
 * follow the published Kuwait column — USGS OFR 94-210 (Bou-Rabee &
 * Kleinkopf, 1994), Douban & Al Medhadi (AAPG, 1999), GeoExpro on Burgan;
 * sources in ../content.ts. Dhruma is left out: USGS does not show it. The depths
 * are crest depths chosen to read well and to agree with the well in
 * ./well.ts (Ahmadi, Wara, Mauddud and the Burgan sands sit where the well
 * meets them). Relief (how much a top bows down off the crest) grows with
 * depth, as it does over a structure that grew while it was buried; ~1,200 ft
 * on the Burgan top, about what GeoExpro's flank dips (under 2° west, up to
 * 10° east) give over a fold this wide.
 *
 * Units: ft TVD below ground. The block is drawn with vertical exaggeration
 * VE, like every published section of a field this size.
 */

/** Lithology, as the shader draws it. */
export const LITH = {
  gravel: 0,
  sand: 1,
  shale: 2,
  limestone: 3,
  dolomite: 4,
  anhydrite: 5,
  marl: 6,
} as const;
export type Lith = keyof typeof LITH;

export type Role = "aquifer" | "seal" | "reservoir" | "source" | "carbonate";

export interface Unit {
  name: string;
  /** Age, short. */
  age: string;
  lith: Lith;
  role: Role;
  /** Top at the crest, ft TVD. */
  top: number;
  /** How far the top sits deeper off-structure, ft. */
  relief: number;
  /** Oil-water contact, ft TVD — oil fills the unit above it, under the crest. */
  owc?: number;
}

/**
 * Crest depths agree with well.ts (Ahmadi 3,560, Wara 3,675, Mauddud 3,880,
 * Burgan 4,010). Grouped where the column has many thin units, so the block
 * stays legible; the SVG column in the chapter lists them in full.
 */
export const UNITS: Unit[] = [
  { name: "Kuwait Group", age: "Miocene–Holocene", lith: "gravel", role: "aquifer", top: 0, relief: 0 },
  { name: "Dammam", age: "Eocene", lith: "limestone", role: "aquifer", top: 620, relief: 150 },
  { name: "Rus", age: "Eocene", lith: "anhydrite", role: "seal", top: 900, relief: 220 },
  { name: "Radhuma", age: "Paleocene", lith: "dolomite", role: "carbonate", top: 1180, relief: 320 },
  { name: "Aruma Group", age: "Late Cretaceous", lith: "limestone", role: "carbonate", top: 1900, relief: 550 },
  { name: "Mishrif · Rumaila", age: "Cenomanian", lith: "limestone", role: "carbonate", top: 2900, relief: 850 },
  { name: "Ahmadi", age: "Cenomanian", lith: "shale", role: "seal", top: 3560, relief: 1100 },
  { name: "Wara", age: "Cenomanian", lith: "sand", role: "reservoir", top: 3675, relief: 1120, owc: 4075 },
  { name: "Mauddud", age: "Albian", lith: "limestone", role: "reservoir", top: 3880, relief: 1150, owc: 4250 },
  { name: "Burgan", age: "Albian", lith: "sand", role: "reservoir", top: 4010, relief: 1200, owc: 4700 },
  { name: "Shuaiba", age: "Aptian", lith: "limestone", role: "carbonate", top: 5050, relief: 1350 },
  { name: "Zubair", age: "Barremian", lith: "sand", role: "reservoir", top: 5300, relief: 1400, owc: 5800 },
  { name: "Ratawi", age: "Hauterivian", lith: "shale", role: "seal", top: 6900, relief: 1600 },
  { name: "Minagish", age: "Berriasian", lith: "limestone", role: "reservoir", top: 7900, relief: 1700, owc: 8400 },
  { name: "Makhul · Sulaiy", age: "Berriasian–Tithonian", lith: "marl", role: "source", top: 8700, relief: 1800 },
  { name: "Hith · Gotnia", age: "Late Jurassic", lith: "anhydrite", role: "seal", top: 10000, relief: 2000 },
  { name: "Najmah · Sargelu", age: "Middle–Late Jurassic", lith: "limestone", role: "reservoir", top: 11500, relief: 2100, owc: 11950 },
  { name: "Marrat", age: "Early Jurassic", lith: "limestone", role: "reservoir", top: 12500, relief: 2200, owc: 13100 },
];

/** The section stops here, ft TVD. */
export const BOTTOM = 15000;
/** Vertical exaggeration on the block. */
export const VE = 2.4;
/** Half-extents of the block, ft (x along the fold, z across it). */
export const XH = 40000;
export const ZH = 22000;
/** The crest sits on the front face, at its middle. */
export const CREST: [number, number] = [0, ZH];
/** The fold's half-widths, ft: long along x, short across. */
export const FOLD: [number, number] = [26000, 15000];

/** 0 at the flanks, 1 on the crest. Mirrors `dome()` in the scene shader. */
export function dome(x: number, z: number): number {
  const dx = (x - CREST[0]) / FOLD[0];
  const dz = (z - CREST[1]) / FOLD[1];
  return Math.exp(-(dx * dx + dz * dz));
}

/** A unit's top at (x, z), ft TVD. */
export function topAt(u: Unit, x: number, z: number): number {
  return u.top + u.relief * (1 - dome(x, z));
}

/** World y of a TVD on the block. */
export const yOf = (tvd: number) => -tvd * VE;

/** Two wells drawn on the front face: one on the crest, one down the flank. */
export const WELLS = [
  { x: 0, td: 4700, label: "Well on the crest", spec: "Finds oil" },
  { x: 29000, td: 4800, label: "Well on the flank", spec: "Same sands · water" },
];

export const ROLE_LABEL: Record<Role, string> = {
  aquifer: "Aquifer",
  seal: "Seal",
  reservoir: "Reservoir",
  source: "Source rock",
  carbonate: "Carbonate",
};
