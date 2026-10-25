/**
 * The learning page's plate: F·E·I's well scene (landing/fei3/gl/scene.ts),
 * driven by the reader's scroll instead of a timed tour, and grown two new
 * scenes in the same drawing style.
 *
 *   rig    the rig, its oil field and the whole well — F·E·I's meshes, plus
 *          component highlighting and the mud running round its loop
 *   block  a geology block diagram: the Kuwait column folded over an
 *          anticline, lithology patterns on its faces, oil under the crest
 *   map    Kuwait as a clay slab with a graticule, each field a low dome
 *
 * Raw WebGL2, no library (KOC's cybersecurity approval freezes whatever
 * ships). Every colour is a KOC token read at runtime — no hex here. The loop
 * stops under reduced motion, when paused, off screen and in hidden tabs; a
 * change of stop then renders one still.
 */

import { Geo, unitBox, unitCylinder } from "./geometry";
import { type M4, type V3, DEG, add, basis, clamp, easeInOut, lerp, lerp3, lookAt, multiply, perspective, project, scale, smooth, sub } from "./math";
import { BHA, CASING, FORMATIONS, H, LANDING_MD, OPEN_HOLE, RKB, TD, station } from "./well";
import {
  PAD_ANGLES,
  PAD_MAX_PUSH,
  bhaPart,
  coupling,
  couplingInstances,
  dpInstances,
  dpJoint,
  floatShoe,
  hwdpJoint,
  partInstance,
  pdcBit,
  rssPad,
  shoeInstance,
} from "./downhole";
import { RIG_MATS, buildRig, type Rig, type RigMat } from "./rig";
import { buildField } from "./landscape";
import { BOTTOM, CREST, FOLD, LITH, UNITS, VE, WELLS, XH, ZH } from "./geology";
import { K, buildFields, buildKuwait, toWorld } from "./map";
import { LABELS, STOPS, type Cam, type SceneId, type Stop } from "./stops";

/* ------------------------------------------------------------------------ */
/* Shaders                                                                   */

const PATH_VS = /* glsl */ `#version 300 es
layout(location=0) in vec3 aLocal;
layout(location=1) in vec3 aLocalN;
layout(location=2) in float aMat;
layout(location=3) in vec4 aFrame;
layout(location=4) in float aMd;
uniform mat4 uVP;
uniform vec3 uH;
uniform float uExag;
uniform float uSpin;
uniform vec3 uPush;
uniform vec4 uOffset;
uniform int uCuttings;
uniform vec4 uCut;
uniform float uTime;
uniform vec3 uLat0;
uniform float uLatMd;
out vec3 vWorld;
out vec3 vNormal;
out float vMat;
out float vMd;
out float vSpan;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

void main() {
  vec3 local = aLocal;
  vec3 ln = aLocalN;
  vec3 center = aFrame.xyz;
  float inc = aFrame.w;
  float md = aMd;

  if (uCuttings == 1) {
    float seed = aFrame.w;
    float speed = mix(0.0, 1.6, step(0.0, seed)) * (0.6 + 0.8 * fract(abs(seed) * 7.31));
    float span = uCut.y - uCut.x;
    md = uCut.x + mod(aFrame.x - uTime * speed - uCut.x, span);
    inc = 1.5707963;
    center = uLat0 + uH * (md - uLatMd);
    float tumble = uTime * speed * 3.0 + abs(seed) * 40.0;
    local = local * aMd;
    local.xy = rot(tumble) * local.xy;
    local.yz = rot(tumble * 0.7) * local.yz;
    ln.xy = rot(tumble) * ln.xy;
    ln.yz = rot(tumble * 0.7) * ln.yz;
    float r = mix(uCut.z, uCut.w, aFrame.z);
    local.yz += vec2(cos(aFrame.y), sin(aFrame.y)) * r;
  } else {
    local.yz += uPush.xy * uPush.z;
    mat2 R = rot(uSpin);
    local.yz = R * local.yz;
    ln.yz = R * ln.yz;
    float off = mix(uOffset.x, uOffset.y, smoothstep(uOffset.z, uOffset.w, md + local.x));
    local.y += off * smoothstep(0.0, 0.35, inc);
  }

  vec3 T = uH * sin(inc) - vec3(0.0, 1.0, 0.0) * cos(inc);
  vec3 N = -uH * cos(inc) - vec3(0.0, 1.0, 0.0) * sin(inc);
  vec3 B = cross(T, N);
  vec3 p = center + T * local.x + (N * local.y + B * local.z) * uExag;
  vNormal = normalize(T * ln.x * uExag + N * ln.y + B * ln.z);
  vWorld = p;
  vMat = aMat;
  vMd = md + local.x;
  vSpan = -1.0;
  gl_Position = uVP * vec4(p, 1.0);
}`;

const WORLD_VS = /* glsl */ `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aMat;
layout(location=3) in vec4 aM0;
layout(location=4) in vec4 aM1;
layout(location=5) in vec4 aM2;
layout(location=6) in vec4 aM3;
uniform mat4 uVP;
out vec3 vWorld;
out vec3 vNormal;
out float vMat;
out float vMd;
out float vSpan;
void main() {
  mat4 M = mat4(aM0, aM1, aM2, aM3);
  vec3 sc = vec3(length(aM0.xyz), length(aM1.xyz), length(aM2.xyz));
  vec3 an = abs(aNrm);
  vSpan = 2.0 * (an.x > 0.5 ? min(sc.y, sc.z) : an.y > 0.5 ? min(sc.x, sc.z) : min(sc.x, sc.y));
  vec4 w = M * vec4(aPos, 1.0);
  vec3 c0 = aM0.xyz, c1 = aM1.xyz, c2 = aM2.xyz;
  vNormal = normalize(c0 * aNrm.x / dot(c0, c0) + c1 * aNrm.y / dot(c1, c1) + c2 * aNrm.z / dot(c2, c2));
  vWorld = w.xyz;
  vMat = aMat;
  vMd = -1.0;
  gl_Position = uVP * w;
}`;

const NU = UNITS.length;
const BURGAN = UNITS.findIndex((u) => u.name === "Burgan");

const FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in float vMat;
in float vMd;
in float vSpan;
uniform vec3 uColor[4];
uniform vec2 uMR[4];
// 0 lit, 1 glass, 3 strata plane, 4 unlit, 5 topographic ground,
// 6 geology block, 7 map slab, 8 field domes
uniform int uMode;
uniform float uAlpha;
uniform float uFacing;
uniform vec3 uCam;
uniform vec3 uKeyDir, uKeyCol;
uniform vec3 uZenith, uFloor;
uniform float uRim, uGlassEnv, uGridA;
uniform float uPathTint;
uniform vec3 uInk, uPaper, uAccent, uClay;
uniform float uFogNear, uFogFar;
uniform vec3 uFocus;
uniform float uFade;
uniform float uTops[6];
uniform float uRkb;
// Component highlight: up to four boxes, and how far it has come on.
uniform int uHiN;
uniform vec3 uHiMin[4];
uniform vec3 uHiMax[4];
uniform float uHiAmt;
// The geology block.
uniform float uGTop[${NU}];
uniform float uGRel[${NU}];
uniform float uGLith[${NU}];
uniform float uGOwc[${NU}];
uniform float uGFocus[${NU}];
uniform float uGFocusAmt;
uniform vec4 uBlock;   // XH, ZH, VE, bottom TVD
uniform vec4 uFold;    // crest x, crest z, half-widths
uniform vec4 uWells;   // well x ×2, TD ×2
uniform float uPat;    // pattern cell, world units
// The map.
uniform vec4 uMapK;    // world units per degree lon, lat; lon0, lat0
uniform vec3 uRegion;  // pick-out weight per region slot
uniform float uRegionAmt;
out vec4 frag;

vec3 lit(vec3 base, float metal, float rough, vec3 N, vec3 V) {
  vec3 L = normalize(uKeyDir);
  float wrap = clamp((dot(N, L) + 0.3) / 1.3, 0.0, 1.0);
  vec3 hemi = mix(uFloor, uZenith, N.y * 0.5 + 0.5);
  vec3 col = base * (hemi + uKeyCol * wrap);
  vec3 H = normalize(L + V);
  col += uKeyCol * mix(0.06, 0.3, metal) * pow(max(dot(N, H), 0.0), mix(60.0, 18.0, rough));
  return col;
}

float gridLine(vec2 q) {
  vec2 fw = max(fwidth(q), vec2(1e-4));
  vec2 g = abs(fract(q - 0.5) - 0.5) / fw;
  float l = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
  return l * (1.0 - smoothstep(0.16, 0.5, max(fw.x, fw.y)));
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float topo(vec2 p) {
  p *= 1.0 / 700.0;
  p += 0.6 * vec2(vnoise(p * 0.7 + 3.1), vnoise(p * 0.7 - 7.4));
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.1 + 11.0) + 0.15 * vnoise(p * 4.3 - 5.0);
}
float isoLine(float v) {
  float fw = max(fwidth(v), 1e-4);
  return (1.0 - clamp(abs(fract(v - 0.5) - 0.5) / fw, 0.0, 1.0)) * (1.0 - smoothstep(0.16, 0.5, fw));
}
/** A line at v == 0 (mod 1), about a pixel wide. */
float hair(float v) {
  float fw = max(fwidth(v), 1e-4);
  return (1.0 - clamp(abs(fract(v + 0.5) - 0.5) / fw, 0.0, 1.0)) * (1.0 - smoothstep(0.2, 0.55, fw));
}

float domeAt(vec2 xz) {
  vec2 d = (xz - uFold.xy) / uFold.zw;
  return exp(-dot(d, d));
}

/** The lithology patterns of a geological section, in cell units. */
float pattern(float lith, vec2 q) {
  float row = floor(q.y);
  vec2 fw = max(fwidth(q), vec2(1e-4));
  float px = max(fw.x, fw.y);
  float fade = 1.0 - smoothstep(0.12, 0.3, px);
  float l = 0.0;
  if (lith < 0.5) {
    // Gravel and sand: open rings, staggered.
    vec2 c = vec2(q.x * 0.75 + 0.5 * mod(row, 2.0), q.y);
    float r = length(fract(c) - 0.5);
    l = 1.0 - smoothstep(0.0, px * 1.4, abs(r - 0.17));
  } else if (lith < 1.5) {
    // Sandstone: stipple.
    vec2 c = vec2(q.x * 1.3 + 0.5 * mod(row, 2.0), q.y * 1.3);
    vec2 cell = floor(c);
    vec2 j = vec2(hash12(cell), hash12(cell + 7.1)) * 0.5 - 0.25;
    float r = length(fract(c) - 0.5 - j * 0.6);
    l = 1.0 - smoothstep(0.07, 0.07 + px * 1.5, r);
  } else if (lith < 2.5) {
    // Shale: short dashes in rows.
    float y = hair(q.y * 2.0);
    float dash = step(fract(q.x * 0.7 + 0.37 * mod(row, 3.0)), 0.55);
    l = y * dash;
  } else if (lith < 4.5) {
    // Limestone: brick. Dolomite: the same with leaning joints.
    float lean = lith > 3.5 ? fract(q.y) * 0.35 : 0.0;
    float h = hair(q.y);
    float v = hair(q.x * 0.5 + 0.5 * mod(row, 2.0) + lean);
    l = max(h, v);
  } else if (lith < 5.5) {
    // Anhydrite and salt: a diagonal hatch.
    l = hair((q.x + q.y) * 0.8);
  } else {
    // Marl: rows, with a dash and a stipple between.
    float h = hair(q.y) * step(fract(q.x * 0.5), 0.8);
    float r = length(fract(vec2(q.x + 0.5 * mod(row, 2.0), q.y)) - 0.5);
    l = max(h, 1.0 - smoothstep(0.06, 0.06 + px * 1.5, r));
  }
  return l * fade;
}

void main() {
  vec3 V = normalize(uCam - vWorld);
  float dist = length(uCam - vWorld);
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, dist);
  int m = int(vMat + 0.5);
  vec3 base = uColor[m];
  vec2 mr = uMR[m];
  vec3 N = normalize(vNormal);

  if (uMode == 3) {
    float tvd = uRkb - vWorld.y;
    float x = vWorld.x;
    float wt = fwidth(tvd);
    float wx = fwidth(x);
    float band = -1.0;
    for (int i = 0; i < 5; i++) if (tvd >= uTops[i]) band = float(i);
    float fill = band < 0.0 ? 0.0 : (mod(band, 2.0) < 0.5 ? 0.075 : 0.04);
    if (tvd > uTops[5]) fill = 0.0;
    float line = 0.0;
    for (int i = 0; i < 5; i++) line = max(line, 1.0 - smoothstep(wt * 0.6, wt * 1.6, abs(tvd - uTops[i])));
    float ground = 1.0 - smoothstep(wt * 0.8, wt * 2.2, abs(tvd - uRkb));
    float gy = abs(fract(tvd / 1000.0 + 0.5) - 0.5) * 1000.0;
    float gx = abs(fract(x / 1000.0 + 0.5) - 0.5) * 1000.0;
    float dash = step(0.5, fract(x / 60.0));
    float dashY = step(0.5, fract(tvd / 60.0));
    float grid = max((1.0 - smoothstep(wt * 0.5, wt * 1.5, gy)) * dash, (1.0 - smoothstep(wx * 0.5, wx * 1.5, gx)) * dashY) * 0.09;
    float edge = smoothstep(uFocus.x - uFade, uFocus.x - uFade * 0.7, x) * smoothstep(uFocus.x + uFade, uFocus.x + uFade * 0.7, x);
    float a = max(max(fill, line * 0.4), max(ground * 0.35, grid)) * edge * uAlpha;
    vec3 c = mix(uInk, uAccent, band < 0.0 ? 0.0 : 0.6);
    frag = vec4(c * a, a);
    return;
  }

  if (uMode == 1) {
    float facing = dot(N, V);
    if (facing * uFacing < 0.0) discard;
    float fr = pow(1.0 - abs(facing), 2.2);
    vec3 c = mix(base, uInk, 0.35 + 0.5 * fr) + uZenith * fr * uGlassEnv;
    c = mix(c, uAccent, uPathTint * (0.75 + 0.25 * fr));
    float a = min(1.0, uAlpha * (0.18 + 0.82 * fr) * (1.0 + 0.7 * uPathTint)) * fog;
    c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
    frag = vec4(c * a, a);
    return;
  }

  vec3 col;
  float g = 0.0;           // line ink over the lit colour
  vec3 lineCol = uAccent;
  if (uMode == 4) col = base;
  else {
    if (dot(N, V) < 0.0) N = -N;

    if (uMode == 6) {
      // The geology block.
      vec3 an = abs(N);
      float tvd = -vWorld.y / uBlock.z;
      if (tvd > uBlock.w + 1.0) discard;
      if (N.y > 0.5) {
        // Ground: a survey grid, and the Burgan top contoured under it, dashed.
        base = mix(uClay, uPaper, 0.15);
        float dm = domeAt(vWorld.xz);
        float burgan = (uGTop[${BURGAN}] + uGRel[${BURGAN}] * (1.0 - dm)) / 100.0;
        float dash = step(0.5, fract((vWorld.x + vWorld.z) / (uPat * 1.2)));
        g = max(gridLine(vWorld.xz / 5000.0) * 0.5, isoLine(burgan) * dash * 0.8);
      } else {
        float dm = domeAt(vWorld.xz);
        int band = 0;
        for (int i = 0; i < ${NU}; i++) if (tvd >= uGTop[i] + uGRel[i] * (1.0 - dm)) band = i;
        float top0 = uGTop[band] + uGRel[band] * (1.0 - dm);
        float top1 = band + 1 < ${NU} ? uGTop[band + 1] + uGRel[band + 1] * (1.0 - dm) : uBlock.w;
        float u = an.x > an.z ? vWorld.z : vWorld.x;
        vec2 q = vec2(u, vWorld.y) / uPat;
        float oil = uGOwc[band] > 0.0 ? 1.0 - smoothstep(uGOwc[band] - 4.0, uGOwc[band] + 4.0, tvd) : 0.0;
        float shade = mod(float(band), 2.0) < 0.5 ? 0.0 : 0.07;
        base = mix(uClay, uInk, shade);
        base = mix(base, uAccent, oil * 0.62);
        float pat = pattern(uGLith[band], q);
        // A hairline at each top, held to a pixel.
        float wt = max(fwidth(tvd), 1e-3);
        float edge = 1.0 - smoothstep(wt * 0.6, wt * 1.8, min(tvd - top0, top1 - tvd));
        g = max(pat * mix(0.5, 0.25, oil), edge * 0.7);
        lineCol = mix(uAccent, uInk, 0.25);
        // Wells, on the front face only.
        if (N.z > 0.5) {
          float wx = fwidth(vWorld.x);
          for (int k = 0; k < 2; k++) {
            float x0 = k == 0 ? uWells.x : uWells.y;
            float td = k == 0 ? uWells.z : uWells.w;
            float on = (1.0 - smoothstep(wx * 1.0, wx * 2.2, abs(vWorld.x - x0))) * step(tvd, td);
            if (on > 0.0) { base = mix(base, uAccent, on); g *= 1.0 - on; }
          }
        }
        // Units the stop is not about step back toward the page.
        base = mix(base, uPaper, (1.0 - uGFocus[band]) * uGFocusAmt * 0.6);
        g *= 1.0 - (1.0 - uGFocus[band]) * uGFocusAmt * 0.6;
      }
      mr = vec2(0.0, 0.9);
    } else if (uMode == 7) {
      // The map: a graticule every quarter degree on top, a section hatch on the walls.
      if (N.y > 0.5) {
        base = uClay;
        vec2 ll = vec2(vWorld.x / uMapK.x + uMapK.z, -vWorld.z / uMapK.y + uMapK.w);
        g = max(gridLine(ll * 4.0) * 0.45, gridLine(ll) * 0.9);
      } else {
        base = mix(uClay, uInk, 0.08);
        g = hair((vWorld.x + vWorld.z + vWorld.y * 1.4) / (uPat * 0.5)) * 0.6;
      }
      mr = vec2(0.0, 0.9);
    } else if (uMode == 8) {
      // A field: a low dome, contoured, its region picked out when the stop names it.
      float w = m == 0 ? uRegion.x : m == 1 ? uRegion.y : uRegion.z;
      float pick = mix(0.18, 0.62, w * uRegionAmt);
      base = mix(uClay, uAccent, pick);
      g = isoLine(vWorld.y / 52.0) * 0.8;
      lineCol = mix(uAccent, uInk, 0.3);
      base = mix(base, uPaper, (1.0 - w) * uRegionAmt * 0.45);
      mr = vec2(0.0, 0.8);
    }

    col = lit(base, mr.x, mr.y, N, V);
    if (uMode == 5) {
      float h = topo(vWorld.xz) * 22.0;
      g = max(isoLine(h) * 0.55, isoLine(h / 5.0)) * 0.75;
    } else if (uMode == 0 && vSpan > 0.0) {
      vec3 an = abs(N);
      vec2 q = an.y > max(an.x, an.z) ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
      g = gridLine(q / 2.5) * smoothstep(3.0, 7.0, vSpan);
    } else if (uMode == 0 && vMd > 0.0) g = isoLine(vMd);
    float ga = uMode >= 6 ? 1.0 : uGridA;
    col = mix(col, lineCol, g * ga);
    float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.5);
    col = mix(col, uPaper, fr * uRim);
  }

  // Picked-out components: KOC blue in the box, everything else steps back.
  if (uHiN > 0 && uHiAmt > 0.0 && (uMode == 0 || uMode == 4 || uMode == 5)) {
    float inside = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= uHiN) break;
      vec3 d = max(uHiMin[i] - vWorld, vWorld - uHiMax[i]);
      float o = max(max(d.x, d.y), d.z);
      inside = max(inside, 1.0 - smoothstep(0.0, 0.6, o));
    }
    col = mix(col, mix(col, uAccent, 0.55), inside * uHiAmt);
    col = mix(col, uPaper, (1.0 - inside) * uHiAmt * 0.5);
  }

  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  float a = uAlpha * fog;
  frag = vec4(col * a, a);
}`;

/* ------------------------------------------------------------------------ */
/* Tokens → linear colour                                                    */

type RGB = [number, number, number];
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const mix3 = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Resolve CSS custom properties to linear sRGB, by painting them into a 1×1 canvas. */
function readTokens(root: HTMLElement, names: string[]): Record<string, RGB> {
  const probe = document.createElement("span");
  probe.style.display = "none";
  root.appendChild(probe);
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const out: Record<string, RGB> = {};
  for (const n of names) {
    probe.style.color = `var(${n})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    out[n] = [toLinear(d[0] / 255), toLinear(d[1] / 255), toLinear(d[2] / 255)];
  }
  probe.remove();
  return out;
}

interface Material {
  color: RGB;
  metal: number;
  rough: number;
}

interface Palette {
  paper: RGB;
  accent: RGB;
  clay: RGB;
  isDark: boolean;
  zenith: RGB;
  floor: RGB;
  key: RGB;
  rim: number;
  line: RGB;
  glass: number;
  glassEnv: number;
  gridA: number;
  m: Record<
    "steel" | "satin" | "bright" | "carbide" | "accent" | "paint" | "glassWin" | "cable" | "casing" | "hole" | "bitBody" | "chip" | "ground",
    Material
  >;
}

/** F·E·I's palette (landing/fei3/gl/scene.ts): clay, ink, KOC blue for the drawing. */
function palette(root: HTMLElement): Palette {
  const t = readTokens(root, ["--foreground", "--background", "--primary", "--muted-foreground", "--card"]);
  const fg = t["--foreground"];
  const bg = t["--background"];
  const mf = t["--muted-foreground"];
  const accent = t["--primary"];
  const card = t["--card"];
  const isDark = document.documentElement.classList.contains("dark") || lum(bg) < lum(fg);
  const black: RGB = [0, 0, 0];
  const ink: RGB = isDark ? bg : fg;
  const clay = isDark ? mix3(card, mf, 0.42) : mix3(card, bg, 0.45);
  const white = isDark ? fg : card;
  const inkTone = mix3(mix3(ink, accent, 0.12), clay, isDark ? 0.45 : 0.3);
  const c = (k: number) => mix3(clay, inkTone, k);
  return {
    paper: bg,
    accent,
    clay,
    isDark,
    zenith: mix3(mix3(white, accent, 0.1), black, isDark ? 0.35 : 0.42),
    floor: isDark ? mix3(mix3(mf, accent, 0.35), black, 0.5) : mix3(mix3(bg, ink, 0.25), black, 0.62),
    key: mix3(white, black, isDark ? 0.35 : 0.46),
    rim: isDark ? 0.5 : 0.35,
    line: mix3(accent, ink, 0.2),
    glass: isDark ? 1.2 : 1.6,
    glassEnv: isDark ? 0.3 : 0.1,
    gridA: isDark ? 0.3 : 0.22,
    m: {
      steel: { color: c(0.12), metal: 0.5, rough: 0.4 },
      satin: { color: c(0.05), metal: 0.6, rough: 0.3 },
      bright: { color: clay, metal: 0.8, rough: 0.2 },
      carbide: { color: inkTone, metal: 0.5, rough: 0.4 },
      accent: { color: accent, metal: 0.3, rough: 0.4 },
      paint: { color: clay, metal: 0, rough: 0.6 },
      glassWin: { color: inkTone, metal: 0.2, rough: 0.2 },
      cable: { color: c(0.6), metal: 0.4, rough: 0.5 },
      casing: { color: c(0.1), metal: 0.5, rough: 0.4 },
      hole: { color: c(0.3), metal: 0, rough: 1 },
      bitBody: { color: clay, metal: 0.4, rough: 0.4 },
      chip: { color: mix3(clay, accent, 0.12), metal: 0, rough: 0.9 },
      ground: { color: isDark ? mix3(bg, clay, 0.3) : c(0.3), metal: 0, rough: 1 },
    },
  };
}

/* ------------------------------------------------------------------------ */
/* GL plumbing                                                               */

interface Program {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

const UNIFORMS = [
  "uVP", "uH", "uExag", "uSpin", "uPush", "uOffset", "uCuttings", "uCut", "uTime", "uLat0", "uLatMd",
  "uColor", "uMR", "uMode", "uAlpha", "uFacing", "uCam", "uKeyDir", "uKeyCol",
  "uZenith", "uFloor", "uRim", "uGlassEnv", "uGridA", "uPathTint", "uInk", "uPaper", "uAccent", "uClay", "uFogNear", "uFogFar", "uFocus", "uFade",
  "uTops", "uRkb", "uHiN", "uHiMin", "uHiMax", "uHiAmt",
  "uGTop", "uGRel", "uGLith", "uGOwc", "uGFocus", "uGFocusAmt", "uBlock", "uFold", "uWells", "uPat",
  "uMapK", "uRegion", "uRegionAmt",
];

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost())
      throw new Error(`Learn scene shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost())
    throw new Error(`Learn scene program: ${gl.getProgramInfoLog(prog)}`);
  const u: Program["u"] = {};
  for (const n of UNIFORMS) u[n] = gl.getUniformLocation(prog, n) ?? gl.getUniformLocation(prog, `${n}[0]`);
  return { prog, u };
}

interface MeshBuf {
  pos: WebGLBuffer;
  nrm: WebGLBuffer;
  mat: WebGLBuffer;
  idx: WebGLBuffer;
  count: number;
}

type MatSlots = [Material, Material, Material, Material];
type Mode = 0 | 1 | 3 | 4 | 5 | 6 | 7 | 8;

interface Draw {
  vao: WebGLVertexArrayObject;
  count: number;
  instances: number;
  world: boolean;
  scene: SceneId;
  mode: Mode;
  mats: MatSlots;
  alpha: number;
  spin?: boolean;
  string?: boolean;
  pad?: number;
  cuttings?: boolean;
  fade?: number;
  focus?: V3;
  /** Visible only when this returns > 0; the value scales alpha. */
  vis?: () => number;
  order: number;
  /** For the mud: the instance buffer is rewritten every frame. */
  dynamic?: WebGLBuffer;
}

type DrawSpec = Omit<Draw, "vao" | "count" | "instances" | "world" | "scene">;

/* ------------------------------------------------------------------------ */
/* The scene                                                                 */

export interface SceneHud {
  md: HTMLElement | null;
  tvd: HTMLElement | null;
  inc: HTMLElement | null;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  /** Element whose computed tokens colour the scene. */
  tokenRoot: HTMLElement;
  /** Empty element the scene fills with positioned labels. */
  labelLayer: HTMLElement;
  hud: SceneHud;
  /** The stop the scene opens on. */
  start: number;
  /** Called when the GPU cannot keep up even at 1× — the host should pause. */
  onDegrade?: () => void;
}

const TRAVEL = 2.4;
const CROSS = 1.5;
/** Mud dots on surface: spacing (ft) and speed (ft/s). */
const FLOW_GAP = 2.6;
const FLOW_SPEED = 9;

export class LearnScene {
  private gl: WebGL2RenderingContext;
  private opts: SceneOptions;
  private pathProg!: Program;
  private worldProg!: Program;
  private draws: Draw[] = [];
  private pal!: Palette;
  private rig!: Rig;
  private raf = 0;
  private running = false;
  private visible = true;
  private paused = false;
  private reduced = false;
  private last = 0;
  private clock = 0;
  private spin = 0;
  private from: number;
  private to: number;
  private phase: "hold" | "travel" = "hold";
  private phaseT = 0;
  private travelLen = TRAVEL;
  private drag = { yaw: 0, pitch: 0 };
  private labelEls: HTMLElement[] = [];
  private labelW: number[] = [];
  private hudTick = 0;
  private size = [1, 1];
  private cleanups: (() => void)[] = [];
  private lost = false;
  private probe: [number, number] = [0, 0];
  private dprCap = 2;
  private flowPaths: { pts: V3[]; cum: number[]; len: number }[] = [];
  private flowCount = 0;

  constructor(opts: SceneOptions) {
    this.opts = opts;
    this.from = this.to = opts.start;
    const gl = opts.canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    // A software rasteriser would freeze the page; VDI/Citrix land here and get the drawings instead.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    if (/swiftshader|llvmpipe|softpipe|basic render|software/i.test(renderer)) throw new Error(`Software renderer: ${renderer}`);
    this.gl = gl;
    this.init();

    const onLost = (e: Event) => {
      e.preventDefault();
      this.lost = true;
      this.stopLoop();
    };
    const onRestored = () => {
      this.lost = false;
      this.draws = [];
      this.init();
      this.kick();
    };
    opts.canvas.addEventListener("webglcontextlost", onLost);
    opts.canvas.addEventListener("webglcontextrestored", onRestored);
    this.cleanups.push(() => {
      opts.canvas.removeEventListener("webglcontextlost", onLost);
      opts.canvas.removeEventListener("webglcontextrestored", onRestored);
    });

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(opts.canvas);
    this.cleanups.push(() => ro.disconnect());

    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    io.observe(opts.canvas);
    this.cleanups.push(() => io.disconnect());

    const onVis = () => this.kick();
    document.addEventListener("visibilitychange", onVis);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

    const mo = new MutationObserver(() => {
      this.refreshPalette();
      this.renderOnce();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    this.cleanups.push(() => mo.disconnect());

    this.makeLabels();
    this.resize();
  }

  /* ---- setup ---------------------------------------------------------- */

  private refreshPalette() {
    const next = palette(this.opts.tokenRoot);
    const cur = this.pal;
    for (const k of Object.keys(next.m) as (keyof Palette["m"])[]) Object.assign(cur.m[k], next.m[k]);
    const { m: _m, ...rest } = next;
    Object.assign(cur, rest);
  }

  private init() {
    const gl = this.gl;
    this.pathProg = compile(gl, PATH_VS, FS);
    this.worldProg = compile(gl, WORLD_VS, FS);
    this.pal = palette(this.opts.tokenRoot);
    this.build();
  }

  private upload(g: Geo): MeshBuf {
    const gl = this.gl;
    const buf = (data: ArrayBufferView, target: number = gl.ARRAY_BUFFER) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return b;
    };
    return {
      pos: buf(new Float32Array(g.pos)),
      nrm: buf(new Float32Array(g.nrm)),
      mat: buf(new Float32Array(g.mat)),
      idx: buf(new Uint32Array(g.idx), gl.ELEMENT_ARRAY_BUFFER),
      count: g.idx.length,
    };
  }

  private vao(mesh: MeshBuf, setup: () => void) {
    const gl = this.gl;
    const v = gl.createVertexArray()!;
    gl.bindVertexArray(v);
    const attr = (loc: number, b: WebGLBuffer, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr(0, mesh.pos, 3);
    attr(1, mesh.nrm, 3);
    attr(2, mesh.mat, 1);
    setup();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
    gl.bindVertexArray(null);
    return v;
  }

  private pathInstanced(g: Geo, frames: Float32Array, d: DrawSpec) {
    const gl = this.gl;
    const mesh = this.upload(g);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, frames, gl.STATIC_DRAW);
    const vao = this.vao(mesh, () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 20, 0);
      gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 20, 16);
      gl.vertexAttribDivisor(4, 1);
    });
    this.draws.push({ ...d, vao, count: mesh.count, instances: frames.length / 5, world: false, scene: "rig" });
  }

  private pathTube(md0: number, md1: number, radius: number, d: DrawSpec, segs = 96) {
    const gl = this.gl;
    const g = new Geo();
    const frames: number[] = [];
    const mds = new Set<number>([md0, md1]);
    for (let md = Math.ceil(md0 / 10) * 10; md < md1; md += 10) {
      const inc = station(md).inc;
      const curving = station(md + 10).inc - inc > 1e-6 || inc - station(md - 10).inc > 1e-6;
      if (curving || md % 250 === 0) mds.add(md);
    }
    const list = [...mds].sort((a, b) => a - b);
    for (const md of list) {
      const s = station(md);
      for (let k = 0; k < segs; k++) {
        const t = (k / segs) * Math.PI * 2;
        g.vert([0, radius * Math.cos(t), radius * Math.sin(t)], [0, Math.cos(t), Math.sin(t)], 0);
        frames.push(s.pos[0], s.pos[1], s.pos[2], s.inc, md);
      }
    }
    for (let i = 0; i < list.length - 1; i++)
      for (let k = 0; k < segs; k++) {
        const a = i * segs + k;
        const b = i * segs + ((k + 1) % segs);
        g.tri(a, a + segs, b + segs);
        g.tri(a, b + segs, b);
      }
    const mesh = this.upload(g);
    const fb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, fb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(frames), gl.STATIC_DRAW);
    const vao = this.vao(mesh, () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, fb);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 20, 16);
    });
    this.draws.push({ ...d, vao, count: mesh.count, instances: 1, world: false, scene: "rig" });
  }

  private worldInstanced(g: Geo, mats: number[], d: DrawSpec, scene: SceneId = "rig", dynamic = false) {
    if (!mats.length) return;
    const gl = this.gl;
    const mesh = this.upload(g);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mats), dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    const vao = this.vao(mesh, () => {
      gl.bindBuffer(gl.ARRAY_BUFFER, ib);
      for (let i = 0; i < 4; i++) {
        gl.enableVertexAttribArray(3 + i);
        gl.vertexAttribPointer(3 + i, 4, gl.FLOAT, false, 64, i * 16);
        gl.vertexAttribDivisor(3 + i, 1);
      }
    });
    this.draws.push({ ...d, vao, count: mesh.count, instances: mats.length / 16, world: true, scene, dynamic: dynamic ? ib : undefined });
  }

  private build() {
    const P = this.pal.m;
    const slots = (a: Material, b = a, c = P.carbide, d = P.bright): MatSlots => [a, b, c, d];
    const near = (limit: number) => () => clamp(1 - (this.cam.dist - limit) / limit);
    const far = (limit: number) => () => clamp((this.cam.dist - limit) / limit);
    const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    /* Rig */
    const rig = (this.rig = buildRig());
    const rigMat: Record<RigMat, Material> = {
      struct: P.paint,
      accent: P.accent,
      steel: P.steel,
      dark: P.carbide,
      glass: P.glassWin,
      cable: P.cable,
    };
    const onSurface = () => this.layer("rig", () => (this.camTarget[1] > -900 || this.cam.dist > 3000 ? 1 : 0));
    const box = unitBox();
    const cyl = unitCylinder(20);
    for (const m of RIG_MATS) {
      const s = slots(rigMat[m]);
      this.worldInstanced(box, rig.box[m], { mode: 0, mats: s, alpha: 1, order: 0, vis: onSurface });
      this.worldInstanced(cyl, rig.cyl[m], { mode: 0, mats: s, alpha: 1, order: 0, vis: onSurface });
      const tg = rig.tubes[m];
      if (tg.count) this.worldInstanced(tg, ident, { mode: 0, mats: s, alpha: 1, order: 0, vis: onSurface });
    }

    /* The field, and the formation plane */
    const field = buildField(rig, RIG_MATS);
    const inField = () => this.layer("field", () => (this.camTarget[1] > -900 ? clamp(1 - (this.cam.dist - 2200) / 1800) : 0));
    this.worldInstanced(field.terrain, ident, { mode: 5, mats: slots(P.ground), alpha: 1, order: 0, vis: inField });
    this.worldInstanced(field.works, ident, { mode: 0, mats: slots(P.steel, P.accent), alpha: 1, order: 0, vis: inField });
    for (const m of RIG_MATS) {
      const s = slots(rigMat[m]);
      this.worldInstanced(box, field.rigs.box[m], { mode: 0, mats: s, alpha: 1, order: 0, vis: inField });
      this.worldInstanced(cyl, field.rigs.cyl[m], { mode: 0, mats: s, alpha: 1, order: 0, vis: inField });
      if (field.rigs.tubes[m].count) this.worldInstanced(field.rigs.tubes[m], ident, { mode: 0, mats: s, alpha: 1, order: 0, vis: inField });
    }
    const SECTION_BOTTOM = 4900;
    const section = new Geo().box([2100, (0 + RKB - SECTION_BOTTOM) / 2, -350], [3500, 0, 0], [0, (SECTION_BOTTOM - RKB) / 2, 0], [0, 0, 0.5], 0);
    this.worldInstanced(section, ident, { mode: 3, mats: slots(P.steel), alpha: 1, order: 1, fade: 3500, focus: [2100, 0, 0], vis: far(1600) });

    /* The mud on surface: dots run round the loop (the circulate stop). */
    const chipGeo = new Geo().box([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0);
    this.flowPaths = [rig.flow.down, rig.flow.up].map((pts) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) {
        const d = sub(pts[i], pts[i - 1]);
        cum.push(cum[i - 1] + Math.hypot(d[0], d[1], d[2]));
      }
      return { pts, cum, len: cum[cum.length - 1] };
    });
    this.flowCount = this.flowPaths.reduce((n, p) => n + Math.floor(p.len / FLOW_GAP), 0);
    this.worldInstanced(chipGeo, new Array(this.flowCount * 16).fill(0), { mode: 4, mats: slots(P.accent), alpha: 1, order: 0, vis: () => this.flowWeight() }, "rig", true);

    /* Borehole and casing (glass), largest first */
    const holes = [
      ...CASING.map((c) => ({ r: c.hole / 24, top: c.holeTop, bottom: c.shoe })),
      { r: OPEN_HOLE.hole / 24, top: OPEN_HOLE.top, bottom: OPEN_HOLE.bottom },
    ];
    holes.forEach((h, i) => this.pathTube(h.top, h.bottom, h.r, { mode: 1, mats: slots(P.hole), alpha: 0.32, order: 2 + i * 0.01 }));
    CASING.forEach((c, i) => this.pathTube(RKB, c.shoe, c.od / 24, { mode: 1, mats: slots(P.casing), alpha: 0.5, order: 3 + i * 0.01 }));
    for (const c of CASING) {
      this.pathInstanced(coupling(c), couplingInstances(c), { mode: 0, mats: slots(P.casing), alpha: 1, order: 0, vis: near(2600) });
      this.pathInstanced(floatShoe(c), shoeInstance(c), { mode: 0, mats: slots(P.casing, P.paint, P.carbide), alpha: 1, order: 0 });
    }

    /* The string */
    const str = { spin: true, string: true, mode: 0 as const, alpha: 1, order: 0 };
    this.pathInstanced(dpJoint(), dpInstances(), { ...str, mats: slots(P.steel, P.steel, P.carbide) });
    const hw = BHA.filter((p) => p.kind === "hwdp");
    this.pathInstanced(hwdpJoint(), new Float32Array(hw.flatMap((p) => [...partInstance(p)])), { ...str, mats: slots(P.steel, P.steel, P.carbide) });
    for (const p of BHA) {
      if (p.kind === "hwdp") continue;
      if (p.kind === "bit") {
        this.pathInstanced(pdcBit(), partInstance(p), { ...str, mats: [P.bitBody, P.bitBody, P.carbide, P.bright], vis: near(400) });
        continue;
      }
      const mats = p.kind === "mwd" ? slots(P.steel, P.accent) : p.kind === "nmdc" ? slots(P.satin, P.satin, P.carbide, P.satin) : slots(P.steel);
      this.pathInstanced(bhaPart(p), partInstance(p), { ...str, mats, vis: near(3000) });
      if (p.kind === "rss")
        PAD_ANGLES.forEach((_, i) =>
          this.pathInstanced(rssPad(PAD_ANGLES[i]), partInstance(p), { ...str, mats: slots(P.steel, P.steel, P.carbide), pad: i, vis: near(400) }),
        );
    }

    /* Cuttings, flowing up the low side, and a bed on it */
    const chip = new Geo();
    {
      const pts: V3[] = [[1, 0.1, 0], [-0.8, 0.2, 0.3], [0.1, 0.9, -0.2], [0.2, -0.8, 0.1], [-0.1, 0.1, 1], [0.3, -0.2, -0.9]];
      const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      for (const f of faces) {
        const [a, b, c] = f.map((i) => pts[i]);
        const n = normFace(a, b, c);
        const s = chip.count;
        chip.vert(a, n, 0);
        chip.vert(b, n, 0);
        chip.vert(c, n, 0);
        chip.tri(s, s + 1, s + 2);
      }
    }
    const cut: number[] = [];
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) {
      const bed = i < 1300;
      const md = TD - 420 + rnd() * 420;
      const ang = (rnd() - 0.5) * (bed ? 1.3 : 2.4);
      const frac = bed ? 0.93 + rnd() * 0.06 : 0.3 + rnd() * 0.6;
      const size = (bed ? 0.012 : 0.008) + rnd() * 0.014;
      cut.push(md, ang, frac, bed ? -(0.1 + rnd()) : 0.1 + rnd(), size);
    }
    this.pathInstanced(chip, new Float32Array(cut), { mode: 0, mats: slots(P.chip), alpha: 1, order: 0, cuttings: true, vis: near(80) });

    /* The geology block */
    const blockGeo = new Geo().box([0, -(BOTTOM * VE) / 2, 0], [XH, 0, 0], [0, (BOTTOM * VE) / 2, 0], [0, 0, ZH], 0);
    this.worldInstanced(blockGeo, ident, { mode: 6, mats: slots(P.paint), alpha: 1, order: 0 }, "block");

    /* Kuwait */
    this.worldInstanced(buildKuwait(), ident, { mode: 7, mats: slots(P.paint), alpha: 1, order: 0 }, "map");
    this.worldInstanced(buildFields().geo, ident, { mode: 8, mats: slots(P.paint), alpha: 1, order: 0 }, "map");

    this.draws.sort((a, b) => a.order - b.order);
  }

  /** A layer's visibility: the stop's override, else the camera's rule, blended across a trip. */
  private layer(key: "rig" | "field", rule: () => number) {
    const a = STOPS[this.from][key];
    const b = STOPS[this.to][key];
    if (a === undefined && b === undefined) return rule();
    const va = a === undefined ? rule() : a ? 1 : 0;
    const vb = b === undefined ? rule() : b ? 1 : 0;
    return lerp(va, vb, this.tEase);
  }

  private flowWeight() {
    return (STOPS[this.from].flow ? 1 - this.tEase : 0) + (STOPS[this.to].flow ? this.tEase : 0);
  }

  /* ---- labels --------------------------------------------------------- */

  private makeLabels() {
    const layer = this.opts.labelLayer;
    layer.replaceChildren();
    this.labelEls = LABELS.map((l) => {
      const el = document.createElement("div");
      el.className = "learn-label";
      el.dataset.side = l.side ?? "right";
      if (l.kind) el.dataset.kind = l.kind;
      const dot = document.createElement("span");
      dot.className = "learn-label-dot";
      const text = document.createElement("span");
      text.className = "learn-label-text";
      // Ticks name one thing ("Makhul · Sulaiy"); callouts are "part · figure".
      const [title, ...spec] = l.kind === "tick" ? [l.text] : l.text.split(" · ");
      const t = document.createElement("span");
      t.className = "learn-label-title";
      t.textContent = title;
      text.append(t);
      if (spec.length) {
        const sp = document.createElement("span");
        sp.className = "learn-label-spec";
        sp.textContent = spec.join(" · ");
        text.append(sp);
      }
      el.append(dot, text);
      layer.appendChild(el);
      return el;
    });
  }

  /* ---- camera --------------------------------------------------------- */

  private cam = { dist: 1, fov: 30 * DEG, exag: 1 };
  private camTarget: V3 = [0, 0, 0];
  private tEase = 0;
  private stopWeight = new Map<string, number>();
  private sceneWeight: Record<SceneId, number> = { rig: 1, block: 0, map: 0 };

  private camPose(c: Cam): { target: V3; md: number | null } {
    if (c.md !== undefined) return { target: station(c.md).pos, md: c.md };
    if (c.part) {
      const [lo, hi] = this.rig.parts[c.part][0];
      return { target: scale(add(lo, hi), 0.5), md: null };
    }
    return { target: c.target!, md: null };
  }

  private computeCamera() {
    const A = STOPS[this.from];
    const B = STOPS[this.to];
    const t = this.phase === "travel" ? easeInOut(clamp(this.phaseT / this.travelLen)) : 0;
    this.tEase = t;
    const cross = A.scene !== B.scene;
    let a = A.cam;
    let b = B.cam;
    let tt = t;
    let dolly = 1;
    if (cross) {
      // Different scenes: fade out where we were, cut, fade in where we go.
      const out = t < 0.5;
      a = b = out ? A.cam : B.cam;
      tt = 0;
      dolly = 1 + 0.18 * (out ? smooth(t * 2) : 1 - smooth(t * 2 - 1));
      this.sceneWeight = { rig: 0, block: 0, map: 0 };
      if (out) this.sceneWeight[A.scene] = 1 - smooth(t * 2);
      else this.sceneWeight[B.scene] = smooth(t * 2 - 1);
    } else {
      this.sceneWeight = { rig: 0, block: 0, map: 0 };
      this.sceneWeight[A.scene] = 1;
    }
    const pa = this.camPose(a);
    const pb = this.camPose(b);
    const lg = (x: number, y: number) => Math.exp(lerp(Math.log(x), Math.log(y), tt));
    const base = lg(a.dist, b.dist);
    const u = Math.abs(Math.log(a.dist / b.dist)) > 1 ? 1 - (base - b.dist) / (a.dist - b.dist) : tt;
    let target: V3;
    let md: number | null = null;
    if (pa.md !== null && pb.md !== null) {
      md = lerp(pa.md, pb.md, u);
      target = station(md).pos;
    } else {
      target = lerp3(pa.target, pb.target, u);
      md = u < 0.5 ? pa.md : pb.md;
    }
    let dist = base * dolly;
    let exag = lg(a.exag ?? 1, b.exag ?? 1);
    const span = Math.hypot(pa.target[0] - pb.target[0], pa.target[1] - pb.target[1], pa.target[2] - pb.target[2]);
    if (!cross && span > 3 * Math.max(a.dist, b.dist)) {
      const hop = Math.pow(Math.sin(Math.PI * tt), 2);
      dist = Math.exp(lerp(Math.log(dist), Math.log(Math.max(dist, span * 1.15)), hop));
      exag = Math.max(exag, lerp(exag, dist / 240, hop));
    }
    const drift = this.reduced ? 0 : Math.sin(this.clock * 0.13) * 0.07;
    const yaw = lerp(a.yaw, b.yaw, tt) + drift + this.drag.yaw;
    const pitch = clamp(lerp(a.pitch, b.pitch, tt) + this.drag.pitch, -0.6, 1.35);
    const fov = lerp(a.fov ?? 30, b.fov ?? 30, tt) * DEG;
    this.cam = { dist, fov, exag };
    this.camTarget = target;
    const eye: V3 = add(target, scale([Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)], dist));
    this.stopWeight.clear();
    this.stopWeight.set(A.id, 1 - t);
    this.stopWeight.set(B.id, (this.stopWeight.get(B.id) ?? 0) + t);
    return { eye, target, md, dist, exag, fov };
  }

  /* ---- frame ---------------------------------------------------------- */

  private frame = (now: number) => {
    this.raf = 0;
    const raw = this.last ? (now - this.last) / 1000 : 0;
    const dt = Math.min(0.1, raw);
    this.last = now;
    this.watchdog(raw);
    if (!this.reduced && !this.paused) {
      this.clock += dt;
      this.spin += dt * 2 * Math.PI * 0.32;
      if (this.phase === "travel") {
        this.phaseT += dt;
        if (this.phaseT >= this.travelLen) {
          this.from = this.to;
          this.phase = "hold";
          this.phaseT = 0;
        }
      }
    }
    this.draw();
    if (this.shouldRun()) this.raf = requestAnimationFrame(this.frame);
    else this.running = false;
  };

  private watchdog(raw: number) {
    if (raw <= 0 || raw > 1) return;
    const p = this.probe;
    p[0]++;
    p[1] += raw;
    if (p[0] < 40) return;
    const avg = p[1] / p[0];
    this.probe = [0, 0];
    if (avg < 0.04) return;
    if (this.dprCap > 1) {
      this.dprCap = 1;
      this.resize();
    } else if (!this.paused) {
      this.opts.onDegrade?.();
    }
  }

  private startTravel(to: number) {
    const a = STOPS[this.to];
    const b = STOPS[to];
    this.from = this.to;
    this.to = to;
    this.phase = "travel";
    this.phaseT = 0;
    this.travelLen = a.scene !== b.scene ? CROSS : TRAVEL + Math.min(2, Math.abs(Math.log(a.cam.dist / b.cam.dist)) * 0.25);
    this.drag = { yaw: 0, pitch: 0 };
  }

  /** Mud dots: positions along each surface loop, rewritten every frame. */
  private writeFlow(d: Draw) {
    const gl = this.gl;
    const out = new Float32Array(this.flowCount * 16);
    let k = 0;
    const r = 0.42;
    for (const p of this.flowPaths) {
      const n = Math.floor(p.len / FLOW_GAP);
      for (let i = 0; i < n; i++) {
        const s = (i * FLOW_GAP + this.clock * FLOW_SPEED) % p.len;
        let j = 1;
        while (j < p.cum.length - 1 && p.cum[j] < s) j++;
        const f = (s - p.cum[j - 1]) / Math.max(1e-6, p.cum[j] - p.cum[j - 1]);
        const pos = lerp3(p.pts[j - 1], p.pts[j], f);
        out.set(basis(pos, [r, 0, 0], [0, r, 0], [0, 0, r]), k * 16);
        k++;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, d.dynamic!);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, out);
  }

  private draw() {
    const gl = this.gl;
    if (this.lost || gl.isContextLost()) return;
    const [w, h] = this.size;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const c = this.computeCamera();
    const aspect = w / h;
    const near = Math.max(0.03, c.dist * 0.015);
    const farP = c.dist * 40 + 800;
    const proj = perspective(c.fov, aspect, near, farP);
    const view = lookAt(c.eye, c.target, [0, 1, 0]);
    const vp = multiply(proj, view);

    const P = this.pal;
    const keyDir: V3 = [-0.45, 0.8, 0.55];
    const land = station(LANDING_MD);

    // What the stop picks out, crossfaded through the trip.
    const A = STOPS[this.from];
    const B = STOPS[this.to];
    const t = this.tEase;
    const hiStop: Stop | null = B.hi && (t >= 0.5 || !A.hi) ? B : A.hi ? A : null;
    const hiAmt = !hiStop ? 0 : A.hi && B.hi ? Math.abs(1 - 2 * t) : hiStop === B ? t : 1 - t;
    const boxes = hiStop ? hiStop.hi!.flatMap((id) => this.rig.parts[id]).slice(0, 4) : [];
    const unitStop: Stop | null = B.units && (t >= 0.5 || !A.units) ? B : A.units ? A : null;
    const unitAmt = !unitStop ? 0 : A.units && B.units ? Math.abs(1 - 2 * t) : unitStop === B ? t : 1 - t;
    const focus = UNITS.map((u) => (unitStop?.units?.includes(u.name) ? 1 : 0));
    const region: V3 = [0, 0, 0];
    const slot = { north: 0, west: 1, south: 2 } as const;
    if (A.region) region[slot[A.region]] += 1 - t;
    if (B.region) region[slot[B.region]] += t;
    const regionAmt = (A.region ? 1 - t : 0) + (B.region ? t : 0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    let current: Program | null = null;
    const use = (p: Program) => {
      if (current === p) return;
      current = p;
      gl.useProgram(p.prog);
      const u = p.u;
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniform3fv(u.uH, H);
      gl.uniform1f(u.uExag, c.exag);
      gl.uniform1f(u.uTime, this.clock);
      gl.uniform3fv(u.uCam, c.eye);
      gl.uniform3fv(u.uKeyDir, keyDir);
      gl.uniform3fv(u.uKeyCol, P.key);
      gl.uniform3fv(u.uZenith, P.zenith);
      gl.uniform3fv(u.uFloor, P.floor);
      gl.uniform1f(u.uRim, P.rim);
      gl.uniform1f(u.uGlassEnv, P.glassEnv);
      gl.uniform1f(u.uGridA, P.gridA);
      gl.uniform1f(u.uPathTint, smooth(clamp((c.dist - 2500) / 7000)));
      gl.uniform3fv(u.uInk, P.line);
      gl.uniform3fv(u.uPaper, P.paper);
      gl.uniform3fv(u.uAccent, P.accent);
      gl.uniform3fv(u.uClay, P.clay);
      gl.uniform1f(u.uFogNear, c.dist * 1.6);
      gl.uniform1f(u.uFogFar, c.dist * 7);
      gl.uniform4f(u.uCut, TD - 420, TD, 0, 0);
      gl.uniform3fv(u.uLat0, land.pos);
      gl.uniform1f(u.uLatMd, LANDING_MD);
      gl.uniform1fv(u.uTops, [...FORMATIONS.map((f) => f.top), 4900]);
      gl.uniform1f(u.uRkb, RKB);
      gl.uniform1i(u.uHiN, boxes.length);
      if (boxes.length) {
        const lo = new Float32Array(12);
        const hi = new Float32Array(12);
        boxes.forEach(([a, b], i) => {
          lo.set(a, i * 3);
          hi.set(b, i * 3);
        });
        gl.uniform3fv(u.uHiMin, lo);
        gl.uniform3fv(u.uHiMax, hi);
      }
      gl.uniform1f(u.uHiAmt, hiAmt);
      gl.uniform1fv(u.uGTop, UNITS.map((x) => x.top));
      gl.uniform1fv(u.uGRel, UNITS.map((x) => x.relief));
      gl.uniform1fv(u.uGLith, UNITS.map((x) => LITH[x.lith]));
      gl.uniform1fv(u.uGOwc, UNITS.map((x) => x.owc ?? 0));
      gl.uniform1fv(u.uGFocus, focus);
      gl.uniform1f(u.uGFocusAmt, unitAmt);
      gl.uniform4f(u.uBlock, XH, ZH, VE, BOTTOM);
      gl.uniform4f(u.uFold, CREST[0], CREST[1], FOLD[0], FOLD[1]);
      gl.uniform4f(u.uWells, WELLS[0].x, WELLS[1].x, WELLS[0].td, WELLS[1].td);
      gl.uniform1f(u.uPat, c.dist * 0.0095);
      const [kx] = toWorld(48.65, 29.3);
      gl.uniform4f(u.uMapK, kx, K, 47.65, 29.3);
      gl.uniform3fv(u.uRegion, region);
      gl.uniform1f(u.uRegionAmt, regionAmt);
    };

    const padSpeed = 1;
    for (const glass of [false, true]) {
      for (const d of this.draws) {
        if ((d.mode === 1 || d.mode === 3) !== glass) continue;
        const sw = this.sceneWeight[d.scene];
        if (sw <= 0.001) continue;
        const vis = (d.vis ? d.vis() : 1) * sw;
        if (vis <= 0.001) continue;
        if (d.dynamic) this.writeFlow(d);
        const p = d.world ? this.worldProg : this.pathProg;
        use(p);
        const u = p.u;
        gl.uniform3fv(u.uColor, d.mats.flatMap((m) => m.color));
        gl.uniform2fv(u.uMR, d.mats.flatMap((m) => [m.metal, m.rough]));
        gl.uniform1i(u.uMode, d.mode);
        gl.uniform1f(u.uAlpha, Math.min(1, d.alpha * vis * (d.mode === 1 ? P.glass : 1)));
        gl.uniform1f(u.uSpin, d.spin ? this.spin : 0);
        gl.uniform1i(u.uCuttings, d.cuttings ? 1 : 0);
        if (d.cuttings) {
          const rIn = 6.75 / 24;
          gl.uniform4f(u.uCut, TD - 420, TD, rIn * 1.02, OPEN_HOLE.hole / 24 - 0.012);
        }
        if (d.string) {
          const jar = BHA.find((b) => b.kind === "jar")!;
          gl.uniform4f(u.uOffset, 0.078, 0.004, jar.top - 10, jar.bottom);
        } else gl.uniform4f(u.uOffset, 0, 0, 0, 1);
        if (d.pad !== undefined) {
          const a = PAD_ANGLES[d.pad];
          const face = Math.cos(a + this.spin * padSpeed);
          const push = Math.pow(Math.max(0, face), 3) * PAD_MAX_PUSH;
          gl.uniform3f(u.uPush, Math.cos(a), Math.sin(a), push);
        } else gl.uniform3f(u.uPush, 0, 0, 0);
        if (d.fade) {
          gl.uniform1f(u.uFade, d.fade);
          gl.uniform3fv(u.uFocus, d.focus ?? [0, 0, 0]);
        }
        gl.depthMask(!glass);
        gl.bindVertexArray(d.vao);
        const passes = d.mode === 1 ? [-1, 1] : [1];
        for (const f of passes) {
          gl.uniform1f(u.uFacing, f);
          gl.drawElementsInstanced(gl.TRIANGLES, d.count, gl.UNSIGNED_INT, 0, d.instances);
        }
      }
    }
    gl.bindVertexArray(null);
    gl.depthMask(true);

    this.placeLabels(vp);
    if (++this.hudTick % 6 === 0 || !this.shouldRun()) this.writeHud(c.md);
  }

  private placeLabels(vp: M4) {
    const rect = this.opts.canvas.getBoundingClientRect();
    // Boxes already placed this frame; a later label that would overlap one is not drawn.
    const taken: [number, number, number, number][] = [];
    LABELS.forEach((l, i) => {
      const el = this.labelEls[i];
      const w = Math.max(0, ...l.in.map((id) => this.stopWeight.get(id) ?? 0));
      const weight = smooth(clamp((w - 0.55) / 0.45));
      if (weight <= 0.01) {
        el.style.opacity = "0";
        return;
      }
      const at = l.at ?? station(l.md!).pos;
      const [x, y, wc] = project(vp, at);
      if (wc <= 0 || Math.abs(x) > 1.02 || Math.abs(y) > 1.02) {
        el.style.opacity = "0";
        return;
      }
      const px = ((x + 1) / 2) * rect.width;
      const py = ((1 - y) / 2) * rect.height;
      // Keep the text inside the plate: a label that would run off the edge is not drawn.
      const tw = (this.labelW[i] ||= (el.lastElementChild as HTMLElement | null)?.offsetWidth ?? 0) || 140;
      const side = l.side ?? "right";
      const x0 = side === "left" ? px - 16 - tw - 28 : side === "below" ? px - 10 : px + 16;
      const x1 = x0 + tw + (side === "right" ? 28 : 0);
      if (x0 < 4 || x1 > rect.width - 4 || py < 12 || py > rect.height - 40) {
        el.style.opacity = "0";
        return;
      }
      const y0 = side === "below" ? py + 18 : py - 14;
      const box: [number, number, number, number] = [x0, y0, x1, y0 + (l.kind ? 14 : 30)];
      if (taken.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) {
        el.style.opacity = "0";
        return;
      }
      taken.push(box);
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      el.style.opacity = String(weight);
    });
  }

  private writeHud(md: number | null) {
    const { hud } = this.opts;
    // A view aimed at a point, not an MD: on the vertical section the depth is
    // the point's own; anywhere else (the plan) it is the whole well.
    const t = this.camTarget;
    const fallback = t[1] > 0 ? 0 : Math.abs(t[0]) < 50 ? RKB - t[1] : TD;
    const s = station(md ?? fallback);
    if (hud.md) hud.md.textContent = Math.max(0, Math.round(s.md)).toLocaleString("en-GB");
    if (hud.tvd) hud.tvd.textContent = Math.max(0, Math.round(s.tvd)).toLocaleString("en-GB");
    if (hud.inc) hud.inc.textContent = (s.inc / DEG).toFixed(1);
  }

  /* ---- control -------------------------------------------------------- */

  private shouldRun() {
    return this.visible && !this.reduced && !this.paused && !this.lost;
  }

  private kick() {
    if (this.shouldRun()) {
      if (!this.running) {
        this.running = true;
        this.last = 0;
        this.raf = requestAnimationFrame(this.frame);
      }
    } else this.renderOnce();
  }

  private stopLoop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
  }

  renderOnce() {
    if (this.running || this.lost) return;
    requestAnimationFrame(() => this.draw());
  }

  private resize() {
    const c = this.opts.canvas;
    const dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.size = [w, h];
    this.labelW = [];
    this.renderOnce();
  }

  /** Fly to a stop. Instant under reduced motion or when paused. */
  goTo(i: number) {
    if (i === this.to && this.phase === "hold") return;
    if (this.reduced || this.paused) {
      this.from = this.to = i;
      this.phase = "hold";
      this.phaseT = 0;
      this.drag = { yaw: 0, pitch: 0 };
      this.renderOnce();
      return;
    }
    if (this.phase === "travel") {
      // Re-aim mid-flight from wherever the trip had got to.
      if (this.phaseT / this.travelLen > 0.5) this.from = this.to;
    }
    this.startTravel(i);
    this.kick();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p && this.phase === "travel") {
      this.from = this.to;
      this.phase = "hold";
      this.phaseT = 0;
    }
    this.kick();
  }

  setReduced(r: boolean) {
    this.reduced = r;
    if (r) {
      this.from = this.to;
      this.phase = "hold";
    }
    this.kick();
  }

  nudge(dx: number, dy: number) {
    this.drag.yaw -= dx * 0.004;
    this.drag.pitch = clamp(this.drag.pitch + dy * 0.003, -0.5, 0.6);
    if (!this.running) this.renderOnce();
  }

  dispose() {
    this.stopLoop();
    for (const c of this.cleanups) c();
    this.opts.labelLayer.replaceChildren();
  }
}

function normFace(a: V3, b: V3, c: V3): V3 {
  const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}
