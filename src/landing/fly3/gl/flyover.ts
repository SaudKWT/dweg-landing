/**
 * The flyover: Datum's endless flight (D v1) over F·E·I's oil field, in
 * F·E·I's language — clay models, KOC blue where a part is painted, and a
 * topographic sheet for the ground, all dissolving into the page with
 * distance. Raw WebGL2 (zero dependencies), transparent canvas: the hero's
 * own background is the sky.
 *
 * The camera flies a gentle, never-repeating heading at a few hundred feet.
 * The field around it is regenerated only when it crosses into a new cell.
 *
 * A well-behaved canvas: the loop stops offscreen, in a hidden tab, when
 * paused and under reduced motion (one composed still instead); DPR steps
 * down if frames run long, and a machine that cannot hold the scene gets a
 * still; context loss is survived; software GL throws so the caller can fall back.
 */

import { Geo } from "./geometry";
import { type M4, type V3, DEG, lookAt, multiply, norm, perspective } from "./math";
import { CELL, cellContent, rigMesh, stationMesh, treeMesh, type Kind } from "./field";

// ── Shaders ────────────────────────────────────────────────────────────────

const OBJ_VS = /* glsl */ `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aMat;
layout(location=3) in vec4 aInst; // x, z, heading, unused
uniform mat4 uVP;
out vec3 vWorld;
out vec3 vNormal;
out float vMat;
void main() {
  float c = cos(aInst.z), s = sin(aInst.z);
  vec3 p = vec3(c * aPos.x + s * aPos.z, aPos.y, -s * aPos.x + c * aPos.z) + vec3(aInst.x, 0.0, aInst.y);
  vNormal = vec3(c * aNrm.x + s * aNrm.z, aNrm.y, -s * aNrm.x + c * aNrm.z);
  vWorld = p;
  vMat = aMat;
  gl_Position = uVP * vec4(p, 1.0);
}`;

const COMMON = /* glsl */ `
uniform vec3 uCam, uKey, uZenith, uFloor, uPaper, uAccent;
uniform float uFogNear, uFogFar, uRim;
float fogAlpha(vec3 w) {
  float d = length(w - uCam);
  return 1.0 - smoothstep(uFogNear, uFogFar, d);
}
vec3 toSrgb(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
`;

const OBJ_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in float vMat;
uniform vec3 uColor[4];
uniform vec3 uKeyDir;
${COMMON}
out vec4 frag;
void main() {
  vec3 V = normalize(uCam - vWorld);
  vec3 N = normalize(vNormal);
  if (dot(N, V) < 0.0) N = -N;
  vec3 base = uColor[int(vMat + 0.5)];
  // Exploded View's clay: a hemisphere, one wrapped key, a small highlight.
  float wrap = clamp((dot(N, uKeyDir) + 0.3) / 1.3, 0.0, 1.0);
  vec3 col = base * (mix(uFloor, uZenith, N.y * 0.5 + 0.5) + uKey * wrap);
  vec3 H = normalize(uKeyDir + V);
  col += uKey * 0.12 * pow(max(dot(N, H), 0.0), 40.0);
  col = mix(col, uPaper, pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.5) * uRim);
  float a = fogAlpha(vWorld);
  frag = vec4(toSrgb(col) * a, a);
}`;

const GROUND_VS = /* glsl */ `#version 300 es
layout(location=0) in vec2 aXZ;
uniform mat4 uVP;
uniform vec3 uCam;
uniform float uExtent;
out vec3 vWorld;
void main() {
  vec3 p = vec3(uCam.x + aXZ.x * uExtent, 0.0, uCam.z + aXZ.y * uExtent);
  vWorld = p;
  gl_Position = uVP * vec4(p, 1.0);
}`;

const GROUND_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uGround, uLine;
uniform float uLineA;
${COMMON}
out vec4 frag;
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
/** The survey's height field — the same sheet as F·E·I's ground. */
float topo(vec2 p) {
  p *= 1.0 / 700.0;
  p += 0.6 * vec2(vnoise(p * 0.7 + 3.1), vnoise(p * 0.7 - 7.4));
  return 0.55 * vnoise(p) + 0.3 * vnoise(p * 2.1 + 11.0) + 0.15 * vnoise(p * 4.3 - 5.0);
}
float isoLine(float v) {
  float fw = max(fwidth(v), 1e-4);
  return (1.0 - clamp(abs(fract(v - 0.5) - 0.5) / fw, 0.0, 1.0)) * (1.0 - smoothstep(0.16, 0.5, fw));
}
void main() {
  float h = topo(vWorld.xz) * 22.0;
  float g = max(isoLine(h) * 0.55, isoLine(h / 5.0)) * 0.75;
  vec3 col = mix(uGround, uLine, g * uLineA);
  float a = fogAlpha(vWorld);
  frag = vec4(toSrgb(col) * a, a);
}`;

// ── Tokens → linear colour ─────────────────────────────────────────────────

type RGB = [number, number, number];
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function readTokens(root: HTMLElement, names: string[]): Record<string, RGB> {
  const probe = document.createElement("span");
  probe.style.display = "none";
  // Under reduced motion every style write would start a 0.01ms transition and
  // the read would return its start value; an inline !important stops that.
  probe.style.setProperty("transition-property", "none", "important");
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

/** F·E·I's roles (fei3/gl/scene.ts palette): clay, ink, KOC blue, every one from a token. */
function palette(root: HTMLElement) {
  const t = readTokens(root, ["--foreground", "--background", "--primary", "--muted-foreground", "--card"]);
  const fg = t["--foreground"], bg = t["--background"], mf = t["--muted-foreground"], accent = t["--primary"], card = t["--card"];
  const dark = document.documentElement.classList.contains("dark") || lum(bg) < lum(fg);
  const black: RGB = [0, 0, 0];
  const ink: RGB = dark ? bg : fg;
  const clay = dark ? mix(card, mf, 0.42) : mix(card, bg, 0.45);
  const white = dark ? fg : card;
  const inkTone = mix(mix(ink, accent, 0.12), clay, dark ? 0.45 : 0.3);
  const c = (k: number) => mix(clay, inkTone, k);
  return {
    colors: [clay, c(0.12), inkTone, accent] as RGB[],
    ground: dark ? mix(bg, clay, 0.3) : c(0.3),
    line: accent,
    lineA: dark ? 0.3 : 0.22,
    key: mix(white, black, dark ? 0.35 : 0.46),
    zenith: mix(mix(white, accent, 0.1), black, dark ? 0.35 : 0.42),
    floor: dark ? mix(mix(mf, accent, 0.35), black, 0.5) : mix(mix(bg, ink, 0.25), black, 0.62),
    paper: bg,
    accent,
    rim: dark ? 0.5 : 0.35,
  };
}

// ── GL plumbing ────────────────────────────────────────────────────────────

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`flyover shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`flyover link: ${gl.getProgramInfoLog(p)}`);
  const cache = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u: (n: string) => {
      if (!cache.has(n)) cache.set(n, gl.getUniformLocation(p, n));
      return cache.get(n)!;
    },
  };
}

interface Mesh {
  vao: WebGLVertexArrayObject;
  inst: WebGLBuffer;
  count: number;
  instances: number;
  buffers: WebGLBuffer[];
}

// ── The flight ─────────────────────────────────────────────────────────────

/** Feet per second, height, and how far the field reaches before the page takes it. */
const SPEED = 42;
const ALT = 330;
const FOG_NEAR = 2200;
const FOG_FAR = 11000;
const REACH = Math.ceil(FOG_FAR / CELL) + 1;
const KEY: V3 = norm([-0.42, 1.0, 0.3]);

export interface FlyoverOptions {
  canvas: HTMLCanvasElement;
  /** Element whose tokens colour the scene. */
  tokenRoot: HTMLElement;
  still: boolean;
  onStats?: (fps: number, dpr: number) => void;
}

export class Flyover {
  private gl: WebGL2RenderingContext;
  private obj!: ReturnType<typeof compile>;
  private ground!: ReturnType<typeof compile>;
  private meshes = {} as Record<Kind, Mesh>;
  private groundVao!: WebGLVertexArrayObject;
  private groundBuf!: WebGLBuffer;
  private geos: Record<Kind, Geo>;
  private pal: ReturnType<typeof palette>;
  private raf = 0;
  private visible = true;
  private still: boolean;
  private lost = false;
  private disposed = false;
  private clock = 0;
  private last = 0;
  private pos: V3 = [0, ALT, 0];
  private cellKey = "";
  private dpr = Math.min(2, window.devicePixelRatio || 1);
  private frames: number[] = [];
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private cleanups: (() => void)[] = [];
  lowPower = false;

  constructor(private o: FlyoverOptions) {
    const gl = o.canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    if (/swiftshader|llvmpipe|softpipe|basic render|software/i.test(name)) throw new Error(`Software renderer: ${name}`);
    this.gl = gl;
    this.still = o.still;
    this.geos = { rig: rigMesh(), tree: treeMesh(), station: stationMesh() };
    this.pal = palette(o.tokenRoot);
    this.init();
    this.bind();
    this.kick();
  }

  setStill(still: boolean) {
    this.still = still || this.lowPower;
    this.kick();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const c of this.cleanups) c();
    const gl = this.gl;
    if (gl.isContextLost()) return;
    for (const m of Object.values(this.meshes)) {
      gl.deleteVertexArray(m.vao);
      for (const b of m.buffers) gl.deleteBuffer(b);
    }
    gl.deleteVertexArray(this.groundVao);
    gl.deleteBuffer(this.groundBuf);
    gl.deleteProgram(this.obj.p);
    gl.deleteProgram(this.ground.p);
  }

  private init() {
    const gl = this.gl;
    this.obj = compile(gl, OBJ_VS, OBJ_FS);
    this.ground = compile(gl, GROUND_VS, GROUND_FS);
    for (const k of Object.keys(this.geos) as Kind[]) this.meshes[k] = this.upload(this.geos[k]);
    this.groundVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.groundVao);
    this.groundBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groundBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.cellKey = "";
  }

  private upload(g: Geo): Mesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffers: WebGLBuffer[] = [];
    const attr = (loc: number, data: number[], size: number) => {
      const b = gl.createBuffer()!;
      buffers.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr(0, g.pos, 3);
    attr(1, g.nrm, 3);
    attr(2, g.mat, 1);
    const ib = gl.createBuffer()!;
    buffers.push(ib);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.idx), gl.STATIC_DRAW);
    const inst = gl.createBuffer()!;
    buffers.push(inst);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
    return { vao, inst, count: g.idx.length, instances: 0, buffers };
  }

  /** Re-place the field around the camera when it enters a new cell. */
  private refreshField() {
    const ci = Math.floor(this.pos[0] / CELL), cj = Math.floor(this.pos[2] / CELL);
    const key = `${ci},${cj}`;
    if (key === this.cellKey) return;
    this.cellKey = key;
    const lists: Record<Kind, number[]> = { rig: [], tree: [], station: [] };
    for (let j = cj - REACH; j <= cj + REACH; j++)
      for (let i = ci - REACH; i <= ci + REACH; i++) {
        if (Math.hypot(i - ci, j - cj) > REACH) continue;
        for (const c of cellContent(i, j)) lists[c.kind].push(c.x, c.z, c.h, 0);
      }
    const gl = this.gl;
    for (const k of Object.keys(lists) as Kind[]) {
      const m = this.meshes[k];
      gl.bindBuffer(gl.ARRAY_BUFFER, m.inst);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lists[k]), gl.DYNAMIC_DRAW);
      m.instances = lists[k].length / 4;
    }
  }

  private bind() {
    const c = this.o.canvas;
    const ro = new ResizeObserver(() => {
      this.resize();
      this.kick();
    });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    io.observe(c);
    const onVis = () => this.kick();
    document.addEventListener("visibilitychange", onVis);
    const theme = new MutationObserver(() => {
      this.pal = palette(this.o.tokenRoot);
      this.kick();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    const onLost = (e: Event) => {
      e.preventDefault();
      this.lost = true;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    };
    const onRestored = () => {
      this.lost = false;
      this.init();
      this.kick();
    };
    c.addEventListener("webglcontextlost", onLost);
    c.addEventListener("webglcontextrestored", onRestored);
    this.cleanups.push(
      () => ro.disconnect(),
      () => io.disconnect(),
      () => document.removeEventListener("visibilitychange", onVis),
      () => theme.disconnect(),
      () => window.removeEventListener("pointermove", move),
      () => c.removeEventListener("webglcontextlost", onLost),
      () => c.removeEventListener("webglcontextrestored", onRestored),
    );
    this.resize();
  }

  private resize() {
    const c = this.o.canvas;
    const r = c.getBoundingClientRect();
    const budget = Math.sqrt(3.2e6 / Math.max(1, r.width * r.height));
    const d = Math.min(this.dpr, budget);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  private running() {
    return !this.still && this.visible && !document.hidden && !this.lost && !this.disposed;
  }

  /** Ask for a frame. Still, that is one frame; otherwise the loop runs while visible. */
  private kick() {
    if (this.raf || this.disposed || this.lost) return;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  /** The flight path: heading drifts slowly and never repeats (incommensurate periods). */
  private heading(t: number) {
    return 0.35 * Math.sin(t * 0.0105) + 0.22 * Math.sin(t * 0.0069 + 1.7) - 0.6;
  }

  private tick(now: number) {
    this.raf = 0;
    if (this.disposed || this.lost) return;
    const run = this.running();
    const dt = run && this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = run ? now : 0;
    this.clock += dt;

    if (run && dt) {
      this.frames.push(dt * 1000);
      if (this.frames.length > 45) this.frames.shift();
      if (this.frames.length === 45) {
        const med = [...this.frames].sort((a, b) => a - b)[22];
        if (med > 24 && this.dpr > 1) {
          this.dpr = Math.max(1, this.dpr - 0.5);
          this.frames = [];
          this.resize();
        } else if (med > 50) {
          this.lowPower = true;
          this.still = true;
        }
        this.o.onStats?.(1000 / med, this.dpr);
      }
    }

    // Fly: integrate the heading so the path curves smoothly.
    const hd = this.heading(this.clock);
    this.pos = [this.pos[0] + Math.sin(hd) * SPEED * dt, ALT + 30 * Math.sin(this.clock * 0.025), this.pos[2] - Math.cos(hd) * SPEED * dt];
    const p = this.pointer;
    p.sx += (p.x - p.sx) * Math.min(1, dt * 2);
    p.sy += (p.y - p.sy) * Math.min(1, dt * 2);
    const look = hd + p.sx * 0.06;
    const pitch = -0.21 - p.sy * 0.025;
    const fwd: V3 = [Math.sin(look) * Math.cos(pitch), Math.sin(pitch), -Math.cos(look) * Math.cos(pitch)];
    const eye = this.pos;
    const target: V3 = [eye[0] + fwd[0] * 100, eye[1] + fwd[1] * 100, eye[2] + fwd[2] * 100];

    this.refreshField();
    this.draw(eye, target);

    if (run) this.kick();
  }

  private draw(eye: V3, target: V3) {
    const gl = this.gl;
    const c = this.o.canvas;
    const P = this.pal;
    const aspect = c.width / c.height;
    const vp: M4 = multiply(perspective(42 * DEG, aspect, 4, FOG_FAR * 1.2), lookAt(eye, target, [0, 1, 0]));
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const common = (s: ReturnType<typeof compile>) => {
      gl.uniformMatrix4fv(s.u("uVP"), false, vp);
      gl.uniform3fv(s.u("uCam"), eye);
      gl.uniform3fv(s.u("uKey"), P.key);
      gl.uniform3fv(s.u("uZenith"), P.zenith);
      gl.uniform3fv(s.u("uFloor"), P.floor);
      gl.uniform3fv(s.u("uPaper"), P.paper);
      gl.uniform3fv(s.u("uAccent"), P.accent);
      gl.uniform1f(s.u("uFogNear"), FOG_NEAR);
      gl.uniform1f(s.u("uFogFar"), FOG_FAR);
      gl.uniform1f(s.u("uRim"), P.rim);
    };

    // The models first, then the ground blended under them: a premultiplied
    // ground over a transparent canvas lets the page show through the fog.
    const o = this.obj;
    gl.useProgram(o.p);
    common(o);
    gl.uniform3fv(o.u("uColor[0]"), P.colors.flat());
    gl.uniform3fv(o.u("uKeyDir"), KEY);
    for (const k of ["rig", "station", "tree"] as Kind[]) {
      const m = this.meshes[k];
      if (!m.instances) continue;
      gl.bindVertexArray(m.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, m.instances);
    }

    const g = this.ground;
    gl.useProgram(g.p);
    common(g);
    gl.uniform1f(g.u("uExtent"), FOG_FAR * 1.1);
    gl.uniform3fv(g.u("uGround"), P.ground);
    gl.uniform3fv(g.u("uLine"), P.line);
    gl.uniform1f(g.u("uLineA"), P.lineA);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(this.groundVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}

