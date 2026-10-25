/**
 * The plates' runtime: a turntable camera, the draw-in between chapters, the
 * render loop, and everything a well-behaved canvas owes the page it sits on.
 *
 * - A chapter change erases the plate top-down, swaps it, and draws the next
 *   bottom-up while the camera re-frames — F's fog wipe, said as a drawing.
 * - Stops entirely under reduced motion (or the page's pause), rendering one
 *   composed still per state change instead.
 * - Pauses offscreen and in a hidden tab; steps DPR down if frames run long,
 *   and holds a still if even DPR 1 cannot keep up.
 * - Survives `webglcontextlost`: stops, waits for restore, re-uploads from the
 *   CPU-side geometry it kept.
 * - Builds plate I first, the rest in a worker, one at a time.
 */

import { animModel } from "./anims";
import { clamp, lerp, v3, type V3 } from "./math";
import { PLATES, plateBase, type PlateDef } from "./plates";
import { Renderer, type DrawItem, type PlateFrame } from "./renderer";
import { BUILDERS, BUILD_ORDER } from "./scene";
import { heightAt } from "./terrain";
import { readPalette } from "./tokens";

export interface Layout {
  /** Where the plate's centre sits, in NDC. */
  shiftX: number;
  shiftY: number;
  /** Fraction of the canvas the plate may fill. */
  availW: number;
  availH: number;
}

export interface EngineState {
  chapter: number;
  /** 0 mid-transition, 1 at rest — callouts fade with it. */
  settle: number;
}

export interface Extent {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  probe: HTMLElement;
  chapter: number;
  still: boolean;
  /** Where the plate may stand, for a canvas this wide (CSS px). */
  layout: (width: number) => Layout;
  onFrame: (project: (p: V3) => [number, number] | null, s: EngineState, extent: Extent) => void;
  /** The first plate has arrived and been drawn. */
  onReady?: () => void;
  onStats?: (fps: number, dpr: number) => void;
}

const FOV = (21 * Math.PI) / 180;
const OUT_MS = 750;
const IN_MS = 2100;
const SETTLE_MS = 450;

interface Plate extends PlateDef {
  base: number;
  /** Highest ground in the disc: the rim's silhouette against the page. */
  ceil: number;
}

const PLATE_DATA: Plate[] = PLATES.map((p) => {
  let ceil = -Infinity;
  for (let r = 0; r <= 6; r++)
    for (let a = 0; a < 36; a++) {
      const t = (a / 36) * Math.PI * 2, rr = (r / 6) * p.radius;
      ceil = Math.max(ceil, heightAt(p.cx + Math.cos(t) * rr, p.cz + Math.sin(t) * rr));
    }
  return { ...p, base: plateBase(p), ceil: Math.max(ceil, 0) };
});

/** The camera relative to its plate's centre, so a re-frame never flies 600 m between plates. */
interface Framing {
  /** Target offset from (cx, 0, cz). */
  off: V3;
  dist: number;
  az: number;
  el: number;
}

const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);


export class Engine {
  private r: Renderer;
  private all: DrawItem[] = [];
  private built = new Set<number>();
  private worker: Worker | null = null;
  private buildTimer = 0;
  private raf = 0;
  private visible = true;
  private pageVisible = !document.hidden;
  private still: boolean;
  private disposed = false;
  private lost = false;
  private cleanups: (() => void)[] = [];
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private clock = 0;
  private lastNow = 0;
  private frameTimes: number[] = [];
  private dpr = Math.min(2, window.devicePixelRatio || 1);
  private cssW = 1;
  private cssH = 1;
  private ready = false;
  /** Set when the watchdog gives up on live rendering; still mode is then permanent. */
  lowPower = false;

  /** The plate on the turntable now, and the one asked for. */
  private drawn: number;
  private want: number;
  private phase: "wait" | "out" | "in" | "idle" = "wait";
  private phaseT0 = 0;
  /** Framing blend across a transition: from → to, by the transition's progress. */
  private fromFraming: Framing | null = null;
  private settledAt = 0;
  private shadowDirty = true;

  constructor(private o: EngineOptions) {
    this.still = o.still;
    this.drawn = this.want = o.chapter;
    // Throws without hardware WebGL2 — the caller shows the line drawing.
    this.r = new Renderer(o.canvas);
    this.r.setPalette(readPalette(o.probe));
    this.measure();
    this.bind();
    this.startBuilds();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  setChapter(i: number) {
    if (i === this.want) return;
    this.fromFraming = this.currentFraming();
    this.want = i;
    if (this.still || !this.built.has(this.drawn)) {
      this.drawn = i;
      this.phase = this.built.has(i) ? "idle" : "wait";
      this.fromFraming = null;
      this.settledAt = 0;
      this.shadowDirty = true;
      this.r.dial = 1;
      this.kick();
      return;
    }
    if (this.phase === "in") {
      // Reverse from wherever the draw-in had reached.
      const p = clamp((performance.now() - this.phaseT0) / IN_MS, 0, 1);
      this.phaseT0 = performance.now() - (1 - p) * OUT_MS;
    } else if (this.phase !== "out") this.phaseT0 = performance.now();
    this.phase = "out";
    this.kick();
  }

  setStill(still: boolean) {
    this.still = still || this.lowPower;
    if (this.still && (this.phase === "out" || this.phase === "in")) {
      this.drawn = this.want;
      this.phase = this.built.has(this.drawn) ? "idle" : "wait";
      this.fromFraming = null;
      this.r.dial = 1;
      this.shadowDirty = true;
    }
    this.kick();
  }

  refreshPalette() {
    if (this.lost) return;
    this.r.setPalette(readPalette(this.o.probe));
    this.kick();
  }

  /** Re-frame after the page's layout changed (the callout column, the breakpoint). */
  relayout() {
    this.measure();
    this.kick();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.buildTimer);
    this.worker?.terminate();
    for (const c of this.cleanups) c();
    this.r.dispose();
  }

  // ── Building ─────────────────────────────────────────────────────────────

  private startBuilds() {
    const order = [this.want, ...BUILD_ORDER.filter((i) => i !== this.want)];
    try {
      const w = new Worker(new URL("./build.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<{ chapter: number; items: DrawItem[] }>) => this.receive(e.data.chapter, e.data.items);
      w.onerror = () => {
        w.terminate();
        this.worker = null;
        this.buildOnMainThread(order);
      };
      for (const i of order) w.postMessage({ chapter: i });
      this.worker = w;
    } catch {
      this.buildOnMainThread(order);
    }
  }

  /** No worker: build here, one plate per task, so the page stays responsive between them. */
  private buildOnMainThread(order: number[]) {
    const next = order.find((i) => !this.built.has(i));
    if (next === undefined || this.disposed) return;
    this.buildTimer = window.setTimeout(() => {
      if (this.disposed) return;
      this.receive(next, BUILDERS[next]());
      this.buildOnMainThread(order);
    }, 30);
  }

  private receive(i: number, items: DrawItem[]) {
    if (this.disposed || this.built.has(i)) return;
    for (const it of items) if (it.anim) it.model = animModel(it.anim);
    this.built.add(i);
    this.all.push(...items);
    this.r.add(items);
    this.frameTimes = [];
    if (i === this.drawn && this.phase === "wait") {
      this.phase = this.still ? "idle" : "in";
      this.phaseT0 = performance.now();
      this.r.dial = this.still ? 1 : 0;
      this.shadowDirty = true;
    }
    this.kick();
  }

  // ── Camera ───────────────────────────────────────────────────────────────

  private measure() {
    const rect = this.o.canvas.getBoundingClientRect();
    this.cssW = rect.width || 1;
    this.cssH = rect.height || 1;
    // Fill-rate budget, as in I's plate: cap the buffer at ~3.2 Mpx.
    const budget = Math.sqrt(3.2e6 / Math.max(1, this.cssW * this.cssH));
    this.r.resize(this.cssW, this.cssH, Math.min(this.dpr, budget));
  }

  /** Fit plate `i` into the layout's box, from a given turntable angle. */
  private frame(i: number, az: number, el: number): Framing {
    const p = PLATE_DATA[i];
    const L = this.o.layout(this.cssW);
    const aspect = this.cssW / this.cssH;
    const ce = Math.cos(el);
    const fwd: V3 = [-ce * Math.sin(az), -Math.sin(el), -ce * Math.cos(az)];
    const right = v3.norm(v3.cross(fwd, [0, 1, 0]));
    const up = v3.cross(right, fwd);
    // Silhouette points: the rim at the base and at its highest ground, and the tallest structure.
    const pts: V3[] = [];
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const x = Math.cos(t) * p.radius, z = Math.sin(t) * p.radius;
      // The dial (1.21 R) around the foot must stay inside the frame too.
      pts.push([x, p.base, z], [x, p.ceil, z], [x * 1.22, p.base, z * 1.22]);
    }
    pts.push([0, p.top, 0]);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of pts) {
      const u = v3.dot(q, right), w = v3.dot(q, up);
      x0 = Math.min(x0, u); x1 = Math.max(x1, u);
      y0 = Math.min(y0, w); y1 = Math.max(y1, w);
    }
    const off = v3.add(v3.scale(right, (x0 + x1) / 2), v3.scale(up, (y0 + y1) / 2));
    const tf = Math.tan(FOV / 2);
    // A little slack for perspective: the near rim projects larger than the far.
    const dist = 1.07 * Math.max((y1 - y0) / 2 / (tf * L.availH), (x1 - x0) / 2 / (tf * aspect * L.availW));
    return { off, dist, az, el };
  }

  private turntable(i: number) {
    const p = PLATE_DATA[i];
    const sway = this.still ? 0 : Math.sin((this.clock / 26) * Math.PI * 2);
    const bob = this.still ? 0 : Math.sin((this.clock / 19) * Math.PI * 2);
    const pt = this.still ? { x: 0, y: 0 } : this.pointer;
    return {
      az: p.azimuth + 0.16 * sway + pt.x * 0.06,
      el: p.elevation + 0.025 * bob - pt.y * 0.03,
    };
  }

  private currentFraming(): Framing {
    const { az, el } = this.turntable(this.drawn);
    return this.frame(this.drawn, az, el);
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  private bind() {
    const c = this.o.canvas;
    const ro = new ResizeObserver(() => {
      this.measure();
      this.kick();
    });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    });
    io.observe(c);
    const vis = () => {
      this.pageVisible = !document.hidden;
      this.kick();
    };
    document.addEventListener("visibilitychange", vis);
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      this.pointer.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5);
      this.pointer.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.5, 1.5);
    };
    window.addEventListener("pointermove", move, { passive: true });
    const onLost = (e: Event) => {
      e.preventDefault();
      this.lost = true;
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    };
    const onRestored = () => {
      try {
        this.r = new Renderer(c);
      } catch {
        return;
      }
      this.lost = false;
      this.r.add(this.all);
      this.r.setPalette(readPalette(this.o.probe));
      this.measure();
      this.shadowDirty = true;
      this.kick();
    };
    c.addEventListener("webglcontextlost", onLost);
    c.addEventListener("webglcontextrestored", onRestored);
    this.cleanups.push(
      () => ro.disconnect(),
      () => io.disconnect(),
      () => document.removeEventListener("visibilitychange", vis),
      () => window.removeEventListener("pointermove", move),
      () => c.removeEventListener("webglcontextlost", onLost),
      () => c.removeEventListener("webglcontextrestored", onRestored),
    );
  }

  /** Ask for a frame. In still mode that is one frame; otherwise the loop runs while visible. */
  private kick() {
    if (this.raf || this.disposed || this.lost) return;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(now: number) {
    this.raf = 0;
    if (this.disposed || this.lost) return;
    const live = this.visible && this.pageVisible;
    const running = !this.still && live;
    const dt = this.lastNow ? Math.min(0.1, (now - this.lastNow) / 1000) : 0;
    this.lastNow = running ? now : 0;
    if (running) this.clock += dt;

    // Adaptive resolution: step DPR down if the last 45 frames ran long (median).
    if (running && dt) {
      this.frameTimes.push(dt * 1000);
      if (this.frameTimes.length > 45) this.frameTimes.shift();
      if (this.frameTimes.length === 45) {
        const med = [...this.frameTimes].sort((a, b) => a - b)[22];
        if (med > 24 && this.dpr > 1) {
          this.dpr = Math.max(1, this.dpr - 0.25);
          this.frameTimes = [];
          this.measure();
        } else if (med > 50) {
          this.lowPower = true;
          this.setStill(true);
        }
        this.o.onStats?.(1000 / med, this.dpr);
      }
    }

    const pt = this.pointer;
    pt.x += (pt.tx - pt.x) * 0.05;
    pt.y += (pt.ty - pt.y) * 0.05;

    // Transition state. Progress runs across out + in, so the camera re-frames
    // in one movement while the plates swap under it.
    let clipY = 1e6, band = 0, total = 1;
    const p = PLATE_DATA[this.drawn];
    const bandH = Math.max(1.4, (p.top - p.base) * 0.05);
    const span = OUT_MS + IN_MS;
    if (this.phase === "out") {
      const k = clamp((now - this.phaseT0) / OUT_MS, 0, 1);
      clipY = lerp(p.top + 2, p.base, easeIn(k));
      band = bandH;
      total = (k * OUT_MS) / span;
      if (k >= 1) {
        this.drawn = this.want;
        this.phase = this.built.has(this.drawn) ? "in" : "wait";
        this.phaseT0 = now;
        this.r.dial = 0;
        clipY = -1e6;
      }
    } else if (this.phase === "in") {
      const k = clamp((now - this.phaseT0) / IN_MS, 0, 1);
      clipY = lerp(p.base, p.top + 2, easeOut(k));
      band = bandH * (1 - k);
      total = (OUT_MS + k * IN_MS) / span;
      this.r.dial = easeOut(clamp(k / 0.7, 0, 1));
      if (k >= 1) {
        this.phase = "idle";
        this.fromFraming = null;
        this.settledAt = now;
        clipY = 1e6;
        band = 0;
      }
    } else if (this.phase === "wait") {
      clipY = -1e6;
    }
    const q = PLATE_DATA[this.drawn];

    // Camera: framed on the plate asked for, blended from where it was when asked.
    const { az, el } = this.turntable(this.want);
    let fr = this.frame(this.want, az, el);
    if (this.fromFraming) {
      const a = this.fromFraming, m = easeInOut(total);
      fr = { off: v3.lerp(a.off, fr.off, m), dist: lerp(a.dist, fr.dist, m), az: lerp(a.az, fr.az, m), el: lerp(a.el, fr.el, m) };
    }
    const target: V3 = [q.cx + fr.off[0], fr.off[1], q.cz + fr.off[2]];
    const ce = Math.cos(fr.el);
    const eye: V3 = [target[0] + fr.dist * ce * Math.sin(fr.az), target[1] + fr.dist * Math.sin(fr.el), target[2] + fr.dist * ce * Math.cos(fr.az)];
    const L = this.o.layout(this.cssW);

    const plate: PlateFrame = { cx: q.cx, cz: q.cz, radius: q.radius, base: q.base, top: q.top, grid: q.grid, contour: q.contour };
    const animated = this.drawn === 3 && running;
    this.r.render({
      eye,
      target,
      fovY: FOV,
      shift: [L.shiftX, L.shiftY],
      time: this.still ? 12 : this.clock,
      chapter: this.drawn,
      plate,
      clipY,
      band,
      shadows: this.shadowDirty || this.phase === "in" || this.phase === "out" || animated,
    });
    this.shadowDirty = false;

    // Callouts come in once the plate has finished drawing.
    let settle = 0;
    if (this.phase === "idle") settle = this.still || !this.settledAt ? 1 : clamp((now - this.settledAt) / SETTLE_MS, 0, 1);
    const project = (w: V3) => this.r.project(w);
    const ext: Extent = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      for (const y of [q.base, q.ceil]) {
        const s = project([q.cx + Math.cos(t) * q.radius, y, q.cz + Math.sin(t) * q.radius]);
        if (!s) continue;
        ext.left = Math.min(ext.left, s[0]);
        ext.right = Math.max(ext.right, s[0]);
        ext.top = Math.min(ext.top, s[1]);
        ext.bottom = Math.max(ext.bottom, s[1]);
      }
    }
    const crown = project([q.cx, q.top, q.cz]);
    if (crown) ext.top = Math.min(ext.top, crown[1]);
    this.o.onFrame(project, { chapter: this.drawn, settle }, ext);
    if (!this.ready && this.phase !== "wait") {
      this.ready = true;
      this.o.onReady?.();
    }

    const transitioning = this.phase === "in" || this.phase === "out" || (this.phase === "idle" && settle < 1);
    if (live && (running || transitioning)) this.kick();
  }
}
