/**
 * The desert's height field, shared by the plinths (scene.ts) and the callout
 * anchors (plates.ts). Copied from F's scene unchanged, so every plate is cut
 * from exactly the ground F's diorama stands on.
 */

import { smoothstep } from "./math";
import { CENTERS } from "./anchors";

export const BASE = -14;

function superR(dx: number, dz: number, a: number, b: number) {
  return Math.pow(Math.pow(Math.abs(dx) / a, 4) + Math.pow(Math.abs(dz) / b, 4), 0.25);
}

/** Ch III: Ahmadi ridge behind, the shore at z ≈ +18, the Gulf beyond. */
function coastProfile(z: number) {
  if (z < -175) return BASE;
  if (z < -128) return BASE + (16 - BASE) * smoothstep(-175, -128, z);
  if (z < -42) return 16;
  if (z < 18) return 1.2 + (16 - 1.2) * (1 - smoothstep(-42, 18, z));
  if (z < 30) return 1.2 - 1.9 * smoothstep(18, 30, z);
  // Steeper than F's: the berth is pulled inshore here (scene.ts), and a
  // loaded tanker draws 7.6 m.
  return -0.7 - 12 * smoothstep(28, 70, z);
}

export function heightAt(x: number, z: number): number {
  // Low swell everywhere, flattened where anything stands.
  let calm = 0;
  for (const c of CENTERS) calm = Math.max(calm, Math.exp(-Math.pow(Math.hypot(x - c[0], z - c[2]) / 70, 4)));
  const swell =
    (1.4 * Math.sin(x * 0.013 + Math.sin(z * 0.02) * 2) * Math.sin(z * 0.017 + 1.3) +
      0.7 * Math.sin(x * 0.041 + z * 0.023) +
      0.35 * Math.sin(x * 0.09 - z * 0.07)) *
    (1 - calm * 0.92);
  let h = BASE + swell;
  // I · Bahra: a flat-topped ridge dome.
  h += 19 * Math.exp(-Math.pow(Math.hypot(x + 900, (z - 5) * 1.25) / 95, 4));
  // II · Burgan: broader, gentler.
  h += 18.5 * Math.exp(-Math.pow(Math.hypot(x + 300, z) / 108, 4));
  // III · the coast.
  const m3 = Math.exp(-Math.pow((x - 300) / 210, 6));
  h += m3 * (coastProfile(z) - BASE);
  // IV · a graded pad on a plateau.
  const r4 = superR(x - 900, z, 100, 82);
  h += (3 - BASE) * (1 - smoothstep(1.0, 1.4, r4));
  return h;
}

