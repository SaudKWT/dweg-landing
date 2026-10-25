/**
 * Rig's hero: F·E·I's well tour — the 2,000 hp rig in its oil field on a
 * topographic sheet, then the well plan, casing, build, BHA and bit — under
 * F·E·I's title, as the first screen of the page rather than its footer.
 *
 * The scene is F·E·I's, copied (gl/). Only the frame changed: the stage fills
 * what the figures leave of the first screen, and the title is the page's h1.
 * Pauses off screen and in hidden tabs, stops under reduced motion, and never
 * sits under a link, a figure or the search.
 */

import "./landing-rig3.css";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/koc";

import { useReducedMotion } from "../shared";
import { WellScene } from "./gl/scene";
import { CASING, FORMATIONS, OPEN_HOLE, TD, station } from "./gl/well";

export function WellStage({ id }: { id: string }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WellScene | null>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  // Lazy-mount: nothing is built until the footer is within ~a screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    // `#/landing/rig3?gl=off` shows the no-WebGL drawing on any machine, for review.
    if (/[?&]gl=off\b/.test(window.location.hash)) {
      setFailed(true);
      return;
    }
    let scene: WellScene;
    try {
      scene = new WellScene({
        canvas: canvasRef.current!,
        tokenRoot: stageRef.current!,
        labelLayer: labelsRef.current!,
        // No readouts or stop buttons in this hero (Saud, 2026-10-25): the tour plays on its own.
        hud: { md: null, tvd: null, inc: null },
        onChapter: () => {},
        shift: () => (window.innerWidth >= 1024 ? 0.36 : 0),
        avoid: () => [copyRef].map((r) => r.current?.getBoundingClientRect()),
        frame: () => bandRef.current?.getBoundingClientRect(),
        onDegrade: () => setPaused(true),
      });
    } catch {
      // No WebGL2, or a software rasteriser: show the flat well plan instead.
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [armed]);

  useEffect(() => sceneRef.current?.setReduced(reduced), [reduced, failed, armed]);
  useEffect(() => sceneRef.current?.setPaused(paused), [paused, failed, armed]);

  // Drag nudges the view. Pointer-only enhancement; the tour needs none of it.
  const drag = useRef<{ x: number; y: number } | null>(null);


  return (
    <section
      ref={stageRef}
      id={id}
      aria-labelledby="rig3-title"
      className="rig3w-stage relative isolate flex min-h-[26rem] flex-1 flex-col overflow-hidden lg:min-h-[13rem] lg:flex-[3] text-foreground"
    >
      {failed ? (
        <WellProfileFallback />
      ) : armed ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="rig3w-canvas absolute inset-0 z-0 size-full cursor-grab touch-pan-y active:cursor-grabbing"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            sceneRef.current?.nudge(e.clientX - drag.current.x, e.clientY - drag.current.y);
            drag.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
      ) : null}
      {/* The hero's tint and scene both end in the page colour, so no edge shows above the figures. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background" />
      <div ref={labelsRef} aria-hidden="true" className="rig3w-labels pointer-events-none absolute inset-0 z-10 overflow-hidden" />

      {/* I's plate: the group's name at INFRA's scale, a Fig. caption, the controls. */}
      <div ref={copyRef} className="relative z-20 px-4 pt-6 sm:px-8 sm:pt-8 lg:max-w-[42%]">
        <h1
          id="rig3-title"
          className="text-[clamp(2.25rem,4.6vw,5.25rem)] font-medium uppercase leading-[0.86] tracking-[-0.04em] text-primary"
        >
          {WORDMARK.map((l) => (
            <span key={l.text} className={cn("block whitespace-nowrap", l.indent)}>
              {l.text}
            </span>
          ))}
        </h1>
      </div>

      {/* On narrow screens the scene gets its own band instead of sitting behind the copy. */}
      <div ref={bandRef} aria-hidden="true" className="pointer-events-none h-[52svh] min-h-72 lg:hidden" />

    </section>
  );
}

const WORDMARK = [
  { text: "Drilling &", indent: "" },
  { text: "Workover", indent: "pl-[1.55em]" },
  { text: "Engineering", indent: "" },
  { text: "— Group", indent: "pl-[2.3em]" },
];

/** Without WebGL2 (or on a software rasteriser): the same well as a flat engineering section. */
function WellProfileFallback() {
  const pts = Array.from({ length: 160 }, (_, i) => station((TD * i) / 159));
  const maxX = 4700;
  const maxY = 4950;
  const x = (d: number) => 60 + (d / maxX) * 880;
  const y = (t: number) => 40 + (t / maxY) * 560;
  const bottoms = [...FORMATIONS.slice(1).map((f) => f.top), 4900];
  const mark = (md: number, text: string, dy = -10, end = false) => {
    const s = station(md);
    return (
      <g key={text}>
        <circle cx={x(s.disp)} cy={y(s.tvd)} r={4.5} className="fill-primary" />
        <text
          x={x(s.disp) + (end ? -10 : 10)}
          y={y(s.tvd) + dy}
          textAnchor={end ? "end" : "start"}
          fontSize={11}
          fill="currentColor"
          fontFamily="var(--font-mono)"
          className="text-foreground"
        >
          {text.toUpperCase()}
        </text>
      </g>
    );
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 640"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-x-0 top-[40%] z-0 h-[45%] w-full text-muted-foreground lg:inset-y-[12%] lg:left-auto lg:right-[2%] lg:h-auto lg:w-[55%]"
    >
      {FORMATIONS.map((f, i) => (
        <g key={f.name}>
          <rect x={20} width={960} y={y(f.top)} height={y(bottoms[i]) - y(f.top)} className="fill-primary" fillOpacity={i % 2 ? 0.05 : 0.1} />
          <line x1={20} x2={980} y1={y(f.top)} y2={y(f.top)} stroke="currentColor" strokeOpacity={0.35} />
          <text x={976} y={(y(f.top) + y(bottoms[i])) / 2 + 3.5} fontSize={9.5} textAnchor="end" fill="currentColor" fontFamily="var(--font-mono)">
            {f.name.toUpperCase()}
          </text>
        </g>
      ))}
      <line x1={20} x2={980} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.5} />
      <polyline
        points={pts.map((s) => `${x(s.disp)},${y(s.tvd)}`).join(" ")}
        fill="none"
        className="text-primary"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {mark(CASING[1].shoe, "13⅜″ shoe · 1,600 ft")}
      {mark(3000, "KOP · 3,000 ft")}
      {mark(OPEN_HOLE.top, "Lands · 9⅝″ shoe", 20)}
      {mark(TD, "TD · 8,150 ft MD", 20, true)}
    </svg>
  );
}
