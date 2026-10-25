/**
 * Raw WebGL2 renderer for the journey plates, in Exploded View's language
 * rather than Burgan's: no sky and no fog. The canvas is transparent, so each
 * plate stands on the page itself — clay-white, a blueprint grid over every
 * face, KOC blue only where F's models carry an accent, a soft key-light
 * shadow, and I's rotary-table dial around the plinth.
 *
 * It draws F's geometry unchanged (8 floats a vertex: position, normal, tone,
 * accent — see geometry.ts). `tone` picks a clay value between ink and white;
 * `accent` mixes toward --primary.
 *
 * Passes:
 *   1. shadow   depth from the key light, orthographic, fitted to the plate
 *   2. ground   premultiplied alpha over the page: shadow, contact, the dial
 *   3. solids   models; the ground's grid and contours; the hatched cut face;
 *               the water layer in section
 *   4. sea      chapter III's surface, translucent over the contoured seabed
 *
 * Every pass honours the draw-in clip: nothing above `clipY` is drawn, and
 * the band just under it is lit KOC blue, so between chapters a plate is
 * erased top-down and the next drawn bottom-up — the catalogue's version of
 * F's fog wipe.
 */

import type { MeshData } from "./geometry";
import type { Anim } from "./anims";
import { m4, v3, type M4, type V3 } from "./math";
import { mix, type Palette, type RGB } from "./tokens";

export interface DrawItem {
  mesh: MeshData;
  /** 16 floats per instance (column-major). Absent = a single draw. */
  instances?: Float32Array;
  /** When set, overrides per-vertex material for every instance. */
  instMat?: [number, number];
  /** 0 model · 1 ground · 2 sea surface · 3 cut face · 4 water in section. */
  kind?: 0 | 1 | 2 | 3 | 4;
  /** The plate it belongs to; only one plate is drawn at a time. */
  chapter: number;
  castShadow?: boolean;
  /** Animated transform, evaluated per frame. Hydrated from `anim` on the main thread. */
  model?: (t: number) => M4;
  /** Serialisable description of the animation (functions cannot leave a worker). */
  anim?: Anim;
}

export interface PlateFrame {
  cx: number;
  cz: number;
  radius: number;
  base: number;
  top: number;
  grid: number;
  contour: number;
}

export interface Frame {
  eye: V3;
  target: V3;
  fovY: number;
  /** Lens shift in NDC: moves the image without turning the camera. */
  shift: [number, number];
  time: number;
  chapter: number;
  plate: PlateFrame;
  /** Nothing above this height is drawn. */
  clipY: number;
  /** Height of the blue band under the clip, metres; 0 when no draw-in is running. */
  band: number;
  /** Re-render the shadow map this frame (something moved, or the clip did). */
  shadows: boolean;
}

const SHADOW = 2048;
/** INFRA's key light: high, from the front left. Fixed to the plate, not the camera. */
const LIGHT: V3 = v3.norm([-0.42, 1.0, 0.3]);

// ── GLSL ───────────────────────────────────────────────────────────────────

const SRGB = /* glsl */ `
vec3 toSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}`;

const SHADOW_FN = /* glsl */ `
uniform highp sampler2DShadow u_shadow;
uniform float u_texel;
const vec2 PD[12] = vec2[](
  vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
  vec2( 0.962,-0.195), vec2( 0.473,-0.480), vec2( 0.519, 0.767), vec2( 0.185,-0.893),
  vec2( 0.507, 0.064), vec2( 0.896, 0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
float shadowAt(vec4 ls, float rad) {
  vec3 p = ls.xyz / ls.w * 0.5 + 0.5;
  if (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;
  float s = 0.0;
  for (int i = 0; i < 12; i++) s += texture(u_shadow, vec3(p.xy + PD[i] * rad * u_texel, p.z - 0.0008));
  return s / 12.0;
}`;

const SCENE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 a_nrm;
layout(location=2) in vec2 a_mat;
layout(location=3) in vec4 i_c0;
layout(location=4) in vec4 i_c1;
layout(location=5) in vec4 i_c2;
layout(location=6) in vec4 i_c3;
uniform mat4 u_vp, u_model, u_light;
uniform float u_useInstMat, u_nOff;
uniform vec2 u_instMat;
out vec3 v_w;
out vec3 v_n;
out vec2 v_m;
out vec4 v_ls;
void main() {
  mat4 M = u_model * mat4(i_c0, i_c1, i_c2, i_c3);
  vec4 w = M * vec4(a_pos, 1.0);
  vec3 c0 = M[0].xyz, c1 = M[1].xyz, c2 = M[2].xyz;
  vec3 s2 = vec3(dot(c0, c0), dot(c1, c1), dot(c2, c2));
  vec3 n = normalize(mat3(M) * (a_nrm / s2));
  v_n = n;
  v_w = w.xyz;
  v_m = mix(a_mat, u_instMat, u_useInstMat);
  // Normal-offset lookup, scaled to this plate's shadow texel: no acne on the
  // derrick's thin members, no peter-panning under the tanks.
  v_ls = u_light * vec4(w.xyz + n * u_nOff, 1.0);
  gl_Position = u_vp * w;
}`;

const SCENE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_w;
in vec3 v_n;
in vec2 v_m;
in vec4 v_ls;
${SHADOW_FN}
${SRGB}
uniform int u_kind;
uniform vec3 u_cam, u_L;
uniform vec3 u_clay, u_ink, u_prim, u_sky, u_gnd, u_key, u_rim, u_line;
uniform float u_lineA, u_rimA, u_shadowFloor, u_seaA;
uniform vec4 u_plate;   // cx, cz, radius, base
uniform vec4 u_grid;    // ground grid, contour interval, model grid, hatch pitch (m)
uniform vec2 u_clip;    // clip height, band height
out vec4 o;

float gridLine(vec2 q) {
  vec2 fw = max(fwidth(q), vec2(1e-4));
  vec2 g = abs(fract(q - 0.5) - 0.5) / fw;
  float l = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
  // Lines closer than a few pixels apart would turn into a tone: fade them out.
  return l * (1.0 - smoothstep(0.16, 0.5, max(fw.x, fw.y)));
}
float isoLine(float v, float px) {
  float fw = max(fwidth(v), 1e-4);
  return (1.0 - clamp(abs(fract(v - 0.5) - 0.5) / (fw * px), 0.0, 1.0)) * (1.0 - smoothstep(0.2, 0.6, fw));
}

void main() {
  vec2 rel = v_w.xz - u_plate.xy;
  // A model never reaches past the rim: the seawater line is cut there, like a section.
  if (u_kind == 0 && length(rel) > u_plate.z) discard;
  if (v_w.y > u_clip.x) discard;

  vec3 V = normalize(u_cam - v_w);
  vec3 N = normalize(v_n);
  float nv = dot(N, V);
  // Mid draw-in the clip opens every solid: its inside reads as a section cap.
  if (nv < 0.0 && u_clip.y > 0.0) { o = vec4(toSrgb(mix(u_prim, u_clay, 0.25)), 1.0); return; }
  // Thin sheets (a tent's canvas, a sign) are seen from both sides.
  if (nv < 0.0) { N = -N; nv = -nv; }

  vec3 alb;
  float ks = 0.06, shin = 18.0, lines = 0.0;
  if (u_kind == 0) {
    float tone = v_m.x, acc = v_m.y;
    alb = mix(u_ink, u_clay, smoothstep(0.12, 0.98, tone));
    alb = mix(alb, u_prim, clamp(acc * 1.35, 0.0, 1.0));
    if (acc > 0.3) { ks = 0.28; shin = 60.0; }
    // The blueprint panelling, in world metres on the face's dominant plane.
    vec3 an = abs(N);
    vec2 q = an.y > max(an.x, an.z) ? v_w.xz : (an.x > an.z ? v_w.zy : v_w.xy);
    lines = gridLine(q / u_grid.z) * u_lineA;
  } else if (u_kind == 1) {
    alb = u_clay;
    // A survey plate: square grid on plan, contours every interval, every fifth heavier.
    lines = gridLine(rel / u_grid.x) * u_lineA * 0.9;
    float c = v_w.y / u_grid.y;
    float minor = isoLine(c, 1.0);
    float major = isoLine(c / 5.0, 1.6);
    lines = max(lines, max(minor * u_lineA * 1.25, major * min(1.0, u_lineA * 2.6)));
  } else if (u_kind == 3) {
    // The cut face: 45° section hatch along the rim, a hairline at the top edge.
    alb = mix(u_clay, u_ink, 0.06);
    float hatch = gridLine(vec2((v_m.x + v_w.y) / u_grid.w, 0.5));
    lines = hatch * u_lineA * 1.5;
  } else {
    // Water in section: the sea's blue, with level lines.
    alb = mix(u_clay, u_prim, 0.38);
    lines = isoLine(v_w.y / (u_grid.w * 0.5), 1.0) * u_lineA * 1.2;
  }

  float ndl = dot(N, u_L);
  float sh = shadowAt(v_ls, 1.9);
  float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  vec3 hemi = mix(u_gnd, u_sky, N.y * 0.5 + 0.5);
  vec3 col = alb * (hemi + u_key * wrap * mix(u_shadowFloor, 1.0, sh));
  vec3 H = normalize(u_L + V);
  col += u_key * ks * pow(max(dot(N, H), 0.0), shin) * sh;
  col = mix(col, u_line, lines);

  // The far faces melt into the page — INFRA's airy edges.
  float fr = pow(1.0 - clamp(nv, 0.0, 1.0), 3.5);
  col = mix(col, u_rim, fr * u_rimA);

  // Draw-in: the band just under the clip is the pen.
  if (u_clip.y > 0.0) {
    float b = clamp((u_clip.x - v_w.y) / u_clip.y, 0.0, 1.0);
    col = mix(col, u_prim, (1.0 - b) * (1.0 - b) * 0.9);
  }
  o = vec4(toSrgb(col), 1.0);
}`;

const SEA_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_w;
in vec3 v_n;
in vec2 v_m;
in vec4 v_ls;
${SHADOW_FN}
${SRGB}
uniform vec3 u_cam, u_L;
uniform vec3 u_clay, u_prim, u_sky, u_gnd, u_key, u_line;
uniform float u_lineA, u_seaA;
uniform vec4 u_plate;
uniform vec4 u_grid;
uniform vec2 u_clip;
out vec4 o;
float gridLine(vec2 q) {
  vec2 fw = max(fwidth(q), vec2(1e-4));
  vec2 g = abs(fract(q - 0.5) - 0.5) / fw;
  return (1.0 - clamp(min(g.x, g.y), 0.0, 1.0)) * (1.0 - smoothstep(0.16, 0.5, max(fw.x, fw.y)));
}
void main() {
  if (v_w.y > u_clip.x) discard;
  vec2 rel = v_w.xz - u_plate.xy;
  vec3 V = normalize(u_cam - v_w);
  float nv = clamp(V.y, 0.0, 1.0);
  float sh = shadowAt(v_ls, 2.4);
  vec3 alb = mix(u_clay, u_prim, 0.42);
  vec3 col = alb * (mix(u_gnd, u_sky, 1.0) + u_key * 0.85 * mix(0.55, 1.0, sh));
  col = mix(col, u_line, gridLine(rel / u_grid.x) * u_lineA * 0.8);
  float a = u_seaA * mix(1.0, 0.72, nv);
  o = vec4(toSrgb(col) * a, a);
}`;

const DEPTH_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=3) in vec4 i_c0;
layout(location=4) in vec4 i_c1;
layout(location=5) in vec4 i_c2;
layout(location=6) in vec4 i_c3;
uniform mat4 u_light, u_model;
out vec3 v_w;
void main() {
  vec4 w = u_model * mat4(i_c0, i_c1, i_c2, i_c3) * vec4(a_pos, 1.0);
  v_w = w.xyz;
  gl_Position = u_light * w;
}`;

const DEPTH_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_w;
uniform int u_kind;
uniform vec4 u_plate;
uniform float u_clipY;
void main() {
  if (v_w.y > u_clipY) discard;
  if (u_kind == 0 && length(v_w.xz - u_plate.xy) > u_plate.z) discard;
}`;

const GROUND_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
uniform mat4 u_vp, u_light;
uniform vec4 u_plate;
out vec3 v_w;
out vec4 v_ls;
void main() {
  // A unit quad, scaled to the dial and set under the plinth.
  vec3 w = vec3(u_plate.x + a_pos.x * u_plate.z * 1.7, u_plate.w, u_plate.y + a_pos.z * u_plate.z * 1.7);
  v_w = w;
  v_ls = u_light * vec4(w, 1.0);
  gl_Position = u_vp * vec4(w, 1.0);
}`;

const GROUND_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_w;
in vec4 v_ls;
${SHADOW_FN}
${SRGB}
uniform vec3 u_ink, u_line, u_prim;
uniform float u_shadowA, u_ringA;
uniform vec4 u_plate;
uniform float u_dial;    // 0..1: the dial draws round with the plate
out vec4 o;
float hair(float d, float w) { return 1.0 - smoothstep(w * 0.5, w * 1.5, abs(d)); }
void main() {
  vec2 rel = v_w.xz - u_plate.xy;
  float R = u_plate.z;
  float r = length(rel) / R;
  if (r > 1.66) discard;
  float px = max(fwidth(r), 1e-5);

  // Shadow where one can land, a contact band at the plinth's foot.
  float sh = r < 1.5 ? 0.5 * (shadowAt(v_ls, 3.0) + shadowAt(v_ls, 7.0)) : 1.0;
  float contact = r > 1.0 ? exp(-pow((r - 1.0) * 26.0, 2.0)) * 0.55 : 0.0;
  float fade = 1.0 - smoothstep(1.05, 1.6, r);
  float dark = clamp((1.0 - sh) * 0.85 + contact, 0.0, 1.0) * fade * u_shadowA;

  // The rotary-table dial: two rings, a tick every 5°, a longer one every 30°,
  // swept on with the plate.
  float ang = atan(rel.y, rel.x);
  float sweep = step(fract((ang / 6.2831853) + 0.25), u_dial);
  float step5 = radians(5.0);
  float d5 = abs(fract(ang / step5 + 0.5) - 0.5) * step5 * r;
  float d30 = abs(fract(ang / (step5 * 6.0) + 0.5) - 0.5) * step5 * 6.0 * r;
  float r0 = 1.12, r1 = 1.21;
  float band5 = step(r0, r) * step(r, r0 + 0.04);
  float band30 = step(r0, r) * step(r, r0 + 0.075);
  float ring = max(max(hair(r - r0, px), hair(r - r1, px)), max(hair(d5, px) * band5, hair(d30, px) * band30));
  float ringA = ring * u_ringA * sweep;

  vec3 col = u_ink * dark + u_line * ringA;
  float a = clamp(dark + ringA, 0.0, 1.0);
  o = vec4(toSrgb(col / max(a, 1e-4)) * a, a);
}`;

// ── GL plumbing ────────────────────────────────────────────────────────────

interface Prog {
  p: WebGLProgram;
  u: (name: string) => WebGLUniformLocation | null;
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Prog {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost())
      throw new Error(gl.getShaderInfoLog(s) ?? "shader compile failed");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost())
    throw new Error(gl.getProgramInfoLog(p) ?? "program link failed");
  const uni = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u: (name) => {
      if (!uni.has(name)) uni.set(name, gl.getUniformLocation(p, name));
      return uni.get(name)!;
    },
  };
}

/**
 * The canvas's WebGL2 context, or null when there is no GPU behind it.
 * Software GL (SwiftShader, llvmpipe, a VDI desktop) would draw these plates
 * on the CPU and freeze the page; it gets the line drawing instead. Same
 * attributes on every call, so a second call returns the same context.
 */
export function hardwareContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) return null;
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name) ? null : gl;
}

interface GpuItem {
  item: DrawItem;
  vao: WebGLVertexArrayObject;
  depthVao: WebGLVertexArrayObject;
  count: number;
  instances: number;
  buffers: WebGLBuffer[];
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private scene: Prog;
  private sea: Prog;
  private depth: Prog;
  private ground: Prog;
  private items = new Map<number, GpuItem[]>();
  private shadowTex: WebGLTexture;
  private shadowFbo: WebGLFramebuffer;
  private quad: WebGLVertexArrayObject;
  private quadBuf: WebGLBuffer;
  private palette: Palette | null = null;
  private lightVP: M4 = m4.identity();
  private nOff = 0.05;
  private texel = 1 / SHADOW;
  width = 1;
  height = 1;
  dpr = 1;
  /** Last frame's view-projection, for projecting callouts onto the page. */
  viewProj: M4 = m4.identity();
  /** How far round the dial has drawn, 0–1. */
  dial = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = hardwareContext(canvas);
    if (!gl) throw new Error("No hardware WebGL2");
    this.gl = gl;
    this.scene = compile(gl, SCENE_VS, SCENE_FS);
    this.sea = compile(gl, SCENE_VS, SEA_FS);
    this.depth = compile(gl, DEPTH_VS, DEPTH_FS);
    this.ground = compile(gl, GROUND_VS, GROUND_FS);

    this.shadowTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW, SHADOW);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    this.shadowFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Non-instanced draws read the instance matrix from constant attributes:
    // identity columns. Constant attribute values are context state, not VAO
    // state, so this is set once.
    gl.vertexAttrib4f(3, 1, 0, 0, 0);
    gl.vertexAttrib4f(4, 0, 1, 0, 0);
    gl.vertexAttrib4f(5, 0, 0, 1, 0);
    gl.vertexAttrib4f(6, 0, 0, 0, 1);
  }

  get lost() {
    return this.gl.isContextLost();
  }

  has(chapter: number) {
    return this.items.has(chapter);
  }

  /** Upload a plate's items; plates arrive one by one from the build worker. */
  add(items: DrawItem[]) {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    for (const item of items) {
      const vbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, item.mesh.vertices, gl.STATIC_DRAW);
      const ibo = gl.createBuffer()!;
      const buffers = [vbo, ibo];
      let ibuf: WebGLBuffer | null = null;
      if (item.instances) {
        ibuf = gl.createBuffer()!;
        buffers.push(ibuf);
        gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
        gl.bufferData(gl.ARRAY_BUFFER, item.instances, gl.STATIC_DRAW);
      }
      const make = (full: boolean) => {
        const vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
        if (full) {
          gl.enableVertexAttribArray(1);
          gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
          gl.enableVertexAttribArray(2);
          gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
        }
        if (ibuf) {
          gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
          for (let c = 0; c < 4; c++) {
            gl.enableVertexAttribArray(3 + c);
            gl.vertexAttribPointer(3 + c, 4, gl.FLOAT, false, 64, c * 16);
            gl.vertexAttribDivisor(3 + c, 1);
          }
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bindVertexArray(null);
        return vao;
      };
      const vao = make(true);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, item.mesh.indices, gl.STATIC_DRAW);
      const depthVao = make(false);
      const list = this.items.get(item.chapter) ?? [];
      list.push({ item, vao, depthVao, count: item.mesh.indices.length, instances: item.instances ? item.instances.length / 16 : 0, buffers });
      this.items.set(item.chapter, list);
    }
  }

  setPalette(p: Palette) {
    this.palette = p;
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.dpr = dpr;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.width = w;
    this.height = h;
  }

  /** The light's view of one plate: centred on it and just big enough. */
  private fitLight(p: PlateFrame) {
    const mid: V3 = [p.cx, (p.base + p.top) / 2, p.cz];
    const half = Math.max(p.radius * 1.25, (p.top - p.base) * 0.75);
    const view = m4.lookAt(v3.add(mid, v3.scale(LIGHT, half * 3)), mid, [0, 0, -1]);
    this.lightVP = m4.mul(m4.ortho(-half, half, -half, half, half * 0.5, half * 6), view);
    const texelWorld = (half * 2) / SHADOW;
    this.nOff = texelWorld * 1.6;
    this.texel = 1 / SHADOW;
  }

  render(f: Frame) {
    const gl = this.gl;
    const P = this.palette;
    if (!P || gl.isContextLost()) return;
    const items = this.items.get(f.chapter) ?? [];
    const roles = this.roles(P);
    const pl = f.plate;
    const plate4 = [pl.cx, pl.cz, pl.radius, pl.base] as const;
    const grid4 = [pl.grid, pl.contour, pl.radius > 80 ? 4 : 1.5, Math.max(0.8, pl.radius / 26)] as const;

    const aspect = this.width / this.height;
    const proj = m4.perspective(f.fovY, aspect, 1, 4000);
    proj[8] = -f.shift[0];
    proj[9] = -f.shift[1];
    const vp = m4.mul(proj, m4.lookAt(f.eye, f.target));
    this.viewProj = vp;

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    // 1 · shadow
    if (f.shadows) {
      this.fitLight(pl);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
      gl.viewport(0, 0, SHADOW, SHADOW);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.6, 3.0);
      const d = this.depth;
      gl.useProgram(d.p);
      gl.uniformMatrix4fv(d.u("u_light"), false, this.lightVP);
      gl.uniform4f(d.u("u_plate"), ...plate4);
      gl.uniform1f(d.u("u_clipY"), f.clipY);
      for (const g of items) {
        if (!g.item.castShadow) continue;
        gl.uniform1i(d.u("u_kind"), g.item.kind ?? 0);
        gl.uniformMatrix4fv(d.u("u_model"), false, g.item.model ? g.item.model(f.time) : m4.identity());
        gl.bindVertexArray(g.depthVao);
        if (g.instances) gl.drawElementsInstanced(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0, g.instances);
        else gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);

    // 2 · ground, blended over the page
    const gp = this.ground;
    gl.useProgram(gp.p);
    gl.uniformMatrix4fv(gp.u("u_vp"), false, vp);
    gl.uniformMatrix4fv(gp.u("u_light"), false, this.lightVP);
    gl.uniform1i(gp.u("u_shadow"), 0);
    gl.uniform1f(gp.u("u_texel"), this.texel);
    gl.uniform4f(gp.u("u_plate"), pl.cx, pl.cz, pl.radius, pl.base - 0.02);
    gl.uniform3fv(gp.u("u_ink"), roles.shadow);
    gl.uniform3fv(gp.u("u_line"), roles.ring);
    gl.uniform3fv(gp.u("u_prim"), P.primary);
    gl.uniform1f(gp.u("u_shadowA"), roles.shadowA);
    gl.uniform1f(gp.u("u_ringA"), roles.ringA);
    gl.uniform1f(gp.u("u_dial"), this.dial);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // 3 · solids
    const setCommon = (s: Prog) => {
      gl.uniformMatrix4fv(s.u("u_vp"), false, vp);
      gl.uniformMatrix4fv(s.u("u_light"), false, this.lightVP);
      gl.uniform1i(s.u("u_shadow"), 0);
      gl.uniform1f(s.u("u_texel"), this.texel);
      gl.uniform1f(s.u("u_nOff"), this.nOff);
      gl.uniform3fv(s.u("u_cam"), f.eye);
      gl.uniform3fv(s.u("u_L"), LIGHT);
      for (const [k, v] of Object.entries(roles.main)) gl.uniform3fv(s.u(k), v as RGB);
      gl.uniform1f(s.u("u_lineA"), roles.lineA);
      gl.uniform1f(s.u("u_rimA"), roles.rimA);
      gl.uniform1f(s.u("u_shadowFloor"), roles.shadowFloor);
      gl.uniform1f(s.u("u_seaA"), roles.seaA);
      gl.uniform4f(s.u("u_plate"), ...plate4);
      gl.uniform4f(s.u("u_grid"), ...grid4);
      gl.uniform2f(s.u("u_clip"), f.clipY, f.band);
    };
    const draw = (s: Prog, g: GpuItem) => {
      const it = g.item;
      gl.uniform1i(s.u("u_kind"), it.kind ?? 0);
      gl.uniformMatrix4fv(s.u("u_model"), false, it.model ? it.model(f.time) : m4.identity());
      gl.uniform1f(s.u("u_useInstMat"), it.instMat ? 1 : 0);
      gl.uniform2fv(s.u("u_instMat"), it.instMat ?? [0, 0]);
      gl.bindVertexArray(g.vao);
      if (g.instances) gl.drawElementsInstanced(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0, g.instances);
      else gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, 0);
    };
    const s = this.scene;
    gl.useProgram(s.p);
    setCommon(s);
    for (const g of items) if (g.item.kind !== 2) draw(s, g);

    // 4 · the sea, over the seabed it lets through
    const seaItems = items.filter((g) => g.item.kind === 2);
    if (seaItems.length) {
      const w = this.sea;
      gl.useProgram(w.p);
      setCommon(w);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const g of seaItems) draw(w, g);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }

  /** Colour roles, every one derived from a KOC semantic token (as in I's plate). */
  private roles(P: Palette) {
    const dark = P.dark;
    const ink: RGB = dark ? P.background : P.foreground;
    const clay = dark ? mix(P.card, P.mutedForeground, 0.42) : mix(P.card, P.background, 0.45);
    const white = dark ? P.foreground : P.card;
    return {
      main: {
        u_clay: clay,
        u_ink: mix(mix(ink, P.primary, 0.12), clay, dark ? 0.45 : 0.3),
        u_prim: P.primary,
        u_sky: mix(mix(white, P.primary, 0.1), [0, 0, 0], dark ? 0.35 : 0.42),
        // Bounce light. On the dark mapping the floor is near-black, so a
        // surface facing down would read as a hole: bounce the dial's blue instead.
        u_gnd: dark
          ? mix(mix(P.mutedForeground, P.primary, 0.35), [0, 0, 0], 0.5)
          : mix(mix(P.background, ink, 0.25), [0, 0, 0], 0.62),
        u_key: mix(white, [0, 0, 0], dark ? 0.35 : 0.46),
        u_rim: P.background,
        u_line: P.primary,
      },
      lineA: dark ? 0.3 : 0.22,
      rimA: dark ? 0.5 : 0.35,
      shadowFloor: dark ? 0.45 : 0.22,
      seaA: dark ? 0.62 : 0.55,
      shadow: mix(ink, P.primary, 0.15),
      shadowA: dark ? 0.5 : 0.18,
      ring: P.primary,
      ringA: dark ? 0.4 : 0.3,
    };
  }

  /** World → CSS pixels (top-left origin). Null when behind the camera. */
  project(p: V3): [number, number] | null {
    const m = this.viewProj;
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    if (w <= 0.01) return null;
    const cw = this.width / this.dpr, ch = this.height / this.dpr;
    return [((x / w) * 0.5 + 0.5) * cw, (1 - ((y / w) * 0.5 + 0.5)) * ch];
  }

  /**
   * Free every GL object, but leave the context alone: under StrictMode the
   * same canvas is mounted again at once, and `getContext` hands back the
   * same context — lose it here and the second mount draws into a dead one.
   */
  dispose() {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    for (const list of this.items.values())
      for (const g of list) {
        gl.deleteVertexArray(g.vao);
        gl.deleteVertexArray(g.depthVao);
        for (const b of g.buffers) gl.deleteBuffer(b);
      }
    this.items.clear();
    gl.deleteTexture(this.shadowTex);
    gl.deleteFramebuffer(this.shadowFbo);
    gl.deleteVertexArray(this.quad);
    gl.deleteBuffer(this.quadBuf);
    for (const p of [this.scene, this.sea, this.depth, this.ground]) gl.deleteProgram(p.p);
  }
}
