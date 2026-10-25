/**
 * F·E·I's footer: Wellpath's whole tour — rig floor, well plan, casing, build,
 * BHA, bit (E v2) — drawn the way Exploded View draws its plate (I v2), under
 * I's title. The meshes, the camera's journey down the hole and the callout
 * placement are E's; the light is I's: clay, a blueprint grid on every part,
 * KOC blue for the drawing, and a ground grid that runs to the horizon and
 * dissolves into the page instead of ending at a disc. See palette() and the
 * fragment shader in gl/scene.ts.
 *
 * It mounts only when the footer comes within reach (IntersectionObserver),
 * pauses off screen and in hidden tabs, stops under reduced motion, and no
 * dashboard link, figure or the search field ever sits over or under it.
 */

import "./landing-fei3.css";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/koc";

import { useReducedMotion } from "../shared";
import { CHAPTERS } from "./gl/chapters";
import { WellScene } from "./gl/scene";
import { CASING, FORMATIONS, OPEN_HOLE, TD, station } from "./gl/well";

export function WellStage({ id }: { id: string }) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const mdRef = useRef<HTMLSpanElement>(null);
  const tvdRef = useRef<HTMLSpanElement>(null);
  const incRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<WellScene | null>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [chapter, setChapter] = useState(0);
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
    // `#/landing/fei3?gl=off` shows the no-WebGL drawing on any machine, for review.
    if (/[?&]gl=off\b/.test(window.location.hash)) {
      setFailed(true);
      setChapter(1);
      return;
    }
    let scene: WellScene;
    try {
      scene = new WellScene({
        canvas: canvasRef.current!,
        tokenRoot: stageRef.current!,
        labelLayer: labelsRef.current!,
        hud: { md: mdRef.current, tvd: tvdRef.current, inc: incRef.current },
        onChapter: setChapter,
        shift: () => (window.innerWidth >= 1024 ? 0.36 : 0),
        avoid: () => [copyRef, controlsRef].map((r) => r.current?.getBoundingClientRect()),
        frame: () => bandRef.current?.getBoundingClientRect(),
        onDegrade: () => setPaused(true),
      });
    } catch {
      // No WebGL2, or a software rasteriser: show the flat well plan instead.
      setFailed(true);
      setChapter(1);
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
      aria-labelledby="fei3w-stage-title"
      className="fei3w-stage relative isolate flex min-h-[max(40rem,min(100svh,52rem))] scroll-mt-0 flex-col overflow-hidden text-foreground"
    >
      {failed ? (
        <WellProfileFallback />
      ) : armed ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fei3w-canvas absolute inset-0 z-0 size-full cursor-grab touch-pan-y active:cursor-grabbing"
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
      <div ref={labelsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />

      {/* I's plate: the group's name at INFRA's scale, a Fig. caption, the controls. */}
      <div ref={copyRef} className="relative z-20 px-4 pt-10 sm:px-8 lg:max-w-[40%]">
        <p className="font-mono text-xs text-muted-foreground">
          02 <span aria-hidden="true">—</span> Plate I
        </p>
        <h2 id="fei3w-stage-title" className="sr-only">
          Wellpath: from rig floor to bit
        </h2>
        <p
          aria-hidden="true"
          className="mt-4 text-[clamp(2.5rem,5vw,5.75rem)] font-medium uppercase leading-[0.86] tracking-[-0.04em] text-primary"
        >
          {WORDMARK.map((l) => (
            <span key={l.text} className={cn("block whitespace-nowrap", l.indent)}>
              {l.text}
            </span>
          ))}
        </p>
      </div>

      {/* On narrow screens the scene gets its own band instead of sitting behind the copy. */}
      <div ref={bandRef} aria-hidden="true" className="pointer-events-none h-[52svh] min-h-72 lg:hidden" />

      <div ref={controlsRef} className="relative z-20 flex flex-col gap-4 px-4 pb-24 sm:px-8 lg:mt-auto lg:max-w-[40%]">
        <div aria-hidden="true" className={cn("hidden gap-6 border-y border-foreground/10 py-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground", !failed && "sm:flex")}>
          <Readout label="MD" unit="ft" valueRef={mdRef} />
          <Readout label="TVD" unit="ft" valueRef={tvdRef} />
          <Readout label="Inc" unit="°" valueRef={incRef} />
        </div>

        <nav aria-label="Well tour" hidden={failed} className="flex flex-wrap items-center gap-1">
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              type="button"
              aria-current={i === chapter ? "step" : undefined}
              onClick={() => sceneRef.current?.goTo(i)}
              disabled={failed}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
                i === chapter ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-accent",
              )}
            >
              <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> {ch.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            disabled={failed || reduced}
            className="ml-1 inline-flex size-7 items-center justify-center rounded-full border border-input bg-background transition-colors duration-fast ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {paused || reduced ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            <span className="sr-only">Pause the well tour</span>
          </button>
        </nav>
      </div>
    </section>
  );
}

const WORDMARK = [
  { text: "Drilling &", indent: "" },
  { text: "Workover", indent: "pl-[1.55em]" },
  { text: "Engineering", indent: "" },
  { text: "— Group", indent: "pl-[2.3em]" },
];

function Readout({ label, unit, valueRef }: { label: string; unit: string; valueRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <div className="min-w-[5rem]">
      <div>{label}</div>
      <div className="mt-0.5 text-sm tabular-nums tracking-tight text-foreground">
        <span ref={valueRef}>0</span>
        <span className="ml-1 text-2xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

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
