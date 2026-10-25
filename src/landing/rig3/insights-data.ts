/**
 * The detail section's figures. EVERY NUMBER HERE IS INVENTED.
 *
 * Saud, 2026-10-25: "I've attached some images of performance analysis — make
 * up the numbers, don't copy." The shapes follow the kinds of analysis KOC's
 * drilling reviews present (well performance against benchmarks, drilling and
 * workover rate improvement, rig moves, water shut-off); none of the values
 * come from them. Contractors are lettered: real contractor names next to
 * invented performance would read as a claim about real companies.
 *
 * Assets keep their real abbreviations (they are KOC's areas, not results).
 */

export const ASSETS = ["NK", "SEK", "WK", "HO", "Gas"] as const;
export type Asset = (typeof ASSETS)[number];
export const ASSET_NAME: Record<Asset, string> = {
  NK: "North Kuwait",
  SEK: "South & East Kuwait",
  WK: "West Kuwait",
  HO: "Heavy Oil",
  Gas: "Gas",
};

/** Financial years, April to March. */
export const FY12 = ["15–16", "16–17", "17–18", "18–19", "19–20", "20–21", "21–22", "22–23", "23–24", "24–25", "25–26", "26–27"];
/** 26–27 runs April to September so far: the last point is a year to date. */
export const YTD_FROM = 11;

// ── Well performance against benchmarks ────────────────────────────────────

/** Bottom first: the band a well falls in, from its days against offset wells. */
export const BANDS = [
  { key: "behind", label: "Behind the median" },
  { key: "median", label: "Ahead of median" },
  { key: "tq", label: "Ahead of top quartile" },
  { key: "bic", label: "Ahead of best in class" },
  { key: "none", label: "No benchmark" },
] as const;

/** Share of wells in each band, by asset, FY 25–26. Each row adds to 100. */
export const WELLS_BY_ASSET: Record<Asset, number[]> = {
  NK: [24, 15, 27, 28, 6],
  SEK: [18, 14, 44, 19, 5],
  WK: [35, 9, 14, 29, 13],
  HO: [9, 18, 73, 0, 0],
  Gas: [31, 12, 27, 22, 8],
};

/** Wells drilled per year, and the share in each band (bottom first). */
export const WELLS_BY_YEAR = {
  total: [362, 498, 615, 431, 338, 402, 371, 446, 438, 489, 712, 301],
  bands: [
    [39, 7, 5, 11, 38],
    [31, 12, 20, 13, 24],
    [28, 22, 22, 12, 16],
    [33, 13, 14, 14, 26],
    [42, 12, 12, 17, 17],
    [49, 11, 14, 15, 11],
    [38, 13, 21, 17, 11],
    [24, 18, 34, 16, 8],
    [21, 16, 39, 19, 5],
    [20, 17, 34, 22, 7],
    [16, 7, 46, 26, 5],
    [10, 8, 43, 35, 4],
  ],
};
/** Top categories: ahead of top quartile plus ahead of best in class. */
export const TOP_CATEGORIES = WELLS_BY_YEAR.bands.map((b) => b[2] + b[3]);

/** Share of each contractor's wells in the top categories, FY 25–26. */
export const CONTRACTORS = [96, 91, 72, 69, 63, 60, 57, 49, 45, 41, 37, 34, 29].map((value, i) => ({
  label: `Contractor ${String.fromCharCode(65 + i)}`,
  value,
}));

/** Median dry-hole days per 1,000 ft, by asset — the learning curve. */
export const LEARNING = {
  years: FY12.slice(1, 11),
  NK: [3.1, 3.0, 2.9, 2.9, 3.0, 3.2, 2.9, 2.6, 2.7, 2.5],
  SEK: [2.6, 2.8, 2.7, 2.8, 2.9, 2.8, 2.4, 2.3, 2.2, 2.1],
  WK: [3.4, 3.0, 3.1, 3.8, 4.6, 4.1, 3.9, 3.2, 3.0, 2.9],
};

/** Productive and non-productive time, share of rig days, FY 25–26. */
export const TIME_SPLIT = [
  { label: "Deep drilling", productive: 71, npt: 29 },
  { label: "Development drilling", productive: 85, npt: 15 },
];

// ── Drilling rate improvement ──────────────────────────────────────────────

/** DRI: days saved against the standard, as a share of standard days. Positive is faster. */
export const DRI_KOC = [-7, 3, 6, 2, -4, -8, -3, 9, 13, 15, 17, 24];
export const DRI_BY_ASSET: Record<Asset, number[]> = {
  NK: [-18, 4, 9, 1, 1, -1, -4, 14, 12, 17, 29, 31],
  SEK: [-10, 2, 5, -2, 0, -8, 2, 15, 17, 22, 27, 19],
  WK: [-6, 16, 7, 2, -10, -12, -6, 8, 7, 3, 22, 27],
  HO: [-9, -4, 2, -15, -24, -14, 8, 4, 15, 9, 13, 33],
  Gas: [41, 6, 1, 11, -17, -7, -15, 1, 16, -16, -10, 6],
};

/** Stuck pipe and mud losses, rig days lost per year. */
export const LOST_DAYS = {
  years: ["23–24", "24–25", "25–26"],
  stuck: [290, 371, 236],
  mud: [498, 602, 365],
};

// ── Rig moves, development drilling ───────────────────────────────────────

export const RIG_MOVES = {
  years: ["23–24", "24–25", "25–26"],
  moves: [318, 401, 742],
  avgDays: [4.9, 3.9, 2.8],
  /** Share of moves finished within the contractual time. */
  compliance: [66, 74, 82],
  /** Rig days ahead (+) or behind (−) contractual move time, summed. */
  daysAhead: [-170, 205, 690],
};

// ── Workover ───────────────────────────────────────────────────────────────

export const QUARTERS = ["Q1 25–26", "Q2 25–26", "Q3 25–26", "Q4 25–26", "Q1 26–27", "Q2 26–27"];
/** WRI: workover duration against the standard for its asset and objective. Positive is faster. */
export const WRI: Record<Asset | "KOC", number[]> = {
  NK: [-6.2, -4.9, -2.8, -1.1, 5.9, 7.1],
  SEK: [2.7, 4.1, 5.2, 6.4, 12.9, 9.3],
  WK: [-15.8, -8.4, -2.9, -3.6, 12.2, -5.1],
  HO: [-3.1, -1.8, 0.4, 2.2, 4.6, 5.8],
  Gas: [-12.6, -5.2, 0.8, -0.7, 1.4, -21.5],
  KOC: [-3.8, -1.6, 0.9, 1.9, 8.8, 4.1],
};
export const WORKOVER_JOBS = { total: 911, within: 688, q1: [374, 92], q2: [314, 131] };

// ── Water shut-off ─────────────────────────────────────────────────────────

/** Success on the first attempt, and within two attempts, by quarter (%), and the jobs behind each. */
export const WSO = [
  { area: "NK", first: [77, 81, 84, 86, 79, 82], second: [96, 95, 97, 95, 90, 95], jobs: [41, 47, 36, 29, 33, 26] },
  { area: "SEK", first: [55, 57, 59, 62, 67, 71], second: [72, 74, 77, 80, 83, 86], jobs: [104, 117, 109, 112, 91, 83] },
  { area: "WK + HO", first: [58, 71, 77, 74, 66, 84], second: [75, 86, 90, 91, 86, 97], jobs: [14, 19, 16, 18, 9, 17] },
] as const;
