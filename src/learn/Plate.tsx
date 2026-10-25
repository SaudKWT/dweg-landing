/**
 * The plate beside the text: one sticky drawing that the reader's scroll
 * drives. Two renderers share it —
 *   - the journey plates (./history, if3's renderer without its plinth) for
 *     chapter 01, Kuwait's first wells;
 *   - the learn scene (./gl/scene.ts, F·E·I's renderer grown two scenes) for
 *     everything else: the rig, the geology block, the map, the well.
 * Only the one in view runs; the other is paused, and the swap is a fade.
 *
 * Without hardware WebGL2 (VDI/Citrix, a software rasteriser) every stop
 * still has a drawing: see ./figures.tsx.
 */

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Hand, Pause, Play } from "lucide-react";

import { cn } from "@/koc";

import { useReducedMotion } from "../landing/shared";
import { STOPS, stopIndex } from "./gl/stops";
import type { LearnScene } from "./gl/scene";
import { FallbackFor } from "./figures";

const Journey = lazy(() => import("./history/Journey").then((m) => ({ default: m.Journey })));

export type PlateView = { kind: "history"; chapter: number } | { kind: "scene"; stop: string };

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Plate({ view, caption, historyArmed }: { view: PlateView; caption: string; historyArmed: boolean }) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const mdRef = useRef<HTMLSpanElement>(null);
  const tvdRef = useRef<HTMLSpanElement>(null);
  const incRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LearnScene | null>(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const stop = view.kind === "scene" ? view.stop : null;
  const lastStop = useRef(stop ?? "hero");
  if (stop) lastStop.current = stop;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    if (/[?&]gl=off\b/.test(window.location.hash)) {
      setFailed(true);
      return;
    }
    let scene: LearnScene | undefined;
    let disposed = false;
    import("./gl/scene")
      .then(({ LearnScene }) => {
        if (disposed) return;
        try {
          scene = new LearnScene({
            canvas: canvasRef.current!,
            tokenRoot: rootRef.current!,
            labelLayer: labelsRef.current!,
            hud: { md: mdRef.current, tvd: tvdRef.current, inc: incRef.current },
            start: stopIndex(lastStop.current),
            onDegrade: () => setPaused(true),
          });
        } catch {
          setFailed(true);
          return;
        }
        sceneRef.current = scene;
        if (import.meta.env.DEV) (window as unknown as { __learnScene?: LearnScene }).__learnScene = scene;
        scene.setReduced(reducedRef.current);
      })
      .catch(() => !disposed && setFailed(true));
    return () => {
      disposed = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const onHistory = view.kind === "history";
  useEffect(() => sceneRef.current?.setReduced(reduced), [reduced]);
  // The scene sleeps while the journey plates have the stage.
  useEffect(() => sceneRef.current?.setPaused(paused || onHistory), [paused, onHistory]);
  useEffect(() => {
    if (stop) sceneRef.current?.goTo(stopIndex(stop));
  }, [stop]);

  const drag = useRef<{ x: number; y: number } | null>(null);
  const hud = !onHistory && STOPS[stopIndex(lastStop.current)].hud;

  return (
    <div ref={rootRef} className="learn-plate relative isolate size-full overflow-hidden">
      {/* The learn scene */}
      <div className={cn("absolute inset-0", !reduced && "transition-opacity duration-slower ease-out", onHistory ? "opacity-0" : "opacity-100")} aria-hidden={onHistory}>
        {failed ? (
          <FallbackFor stop={lastStop.current} />
        ) : (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="learn-canvas absolute inset-0 size-full cursor-grab touch-pan-y active:cursor-grabbing"
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
        )}
        <div ref={labelsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      </div>

      {/* The journey plates, mounted once chapter 01 comes near */}
      {historyArmed && (
        <div
          className={cn("absolute inset-0", !reduced && "transition-opacity duration-slower ease-out", onHistory ? "opacity-100" : "pointer-events-none opacity-0")}
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            <Journey
              chapter={view.kind === "history" ? view.chapter : 2}
              paused={paused || !onHistory}
              reduced={reduced}
              onFallback={() => setHistoryFailed(true)}
            />
          </Suspense>
        </div>
      )}

      {/* I's plate furniture: the caption top-left, the readout and controls along the foot. */}
      <p className="pointer-events-none absolute left-4 top-4 z-10 font-mono text-2xs uppercase tracking-wider text-muted-foreground sm:left-6 sm:top-5" aria-live="polite">
        {caption}
      </p>
      <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-5">
        <div aria-hidden="true" className={cn("flex gap-6 font-mono text-2xs uppercase tracking-wider text-muted-foreground", (!hud || failed) && "invisible")}>
          <Readout label="MD" unit="ft" valueRef={mdRef} />
          <Readout label="TVD" unit="ft" valueRef={tvdRef} />
          <Readout label="Inc" unit="°" valueRef={incRef} />
        </div>
        <div className="flex items-center gap-2">
          {!failed && !(onHistory && historyFailed) && (
            <span className="hidden items-center gap-1.5 text-2xs text-muted-foreground lg:inline-flex">
              <Hand className="size-3.5" aria-hidden="true" />
              Drag to look around
            </span>
          )}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            disabled={failed || reduced}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full border border-input bg-background transition-colors duration-fast ease-out hover:bg-accent disabled:opacity-50",
              FOCUS_RING,
            )}
          >
            {paused || reduced ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
            <span className="sr-only">Pause the drawing's motion</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, unit, valueRef }: { label: string; unit: string; valueRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <div className="min-w-[4.5rem]">
      <div>{label}</div>
      <div className="mt-0.5 text-sm tabular-nums tracking-tight text-foreground">
        <span ref={valueRef}>0</span>
        <span className="ml-1 text-2xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
