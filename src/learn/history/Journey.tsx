/**
 * Plates I–IV: Burgan's journey, drawn as Exploded View draws a product.
 *
 * The component owns everything the canvas owes the page, so the footer
 * around it does not have to think about any of it:
 *   - lazy: the WebGL code is not fetched until the parent mounts this, which
 *     it does only as the footer approaches
 *   - tokens read at runtime, re-read when `.dark` toggles on <html>
 *   - offscreen, hidden tab, paused, reduced motion: the loop stops (reduced
 *     motion renders one composed still per state change)
 *   - context loss is survived by the engine; no hardware WebGL2 → the line
 *     drawing in Fallback.tsx
 *
 * Callouts are HTML, italic serif like INFRA's, placed from projected anchors
 * every frame by direct DOM writes — a 60 fps loop never re-renders React.
 * Chapter IV's callouts are the eight teams, and they are buttons.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/koc";

import { Fallback } from "./Fallback";
import type { Engine, EngineState, Extent, Layout } from "./gl/engine";
import type { V3 } from "./gl/math";
import { CALLOUTS } from "./gl/plates";

/** Tailwind's `lg` — where the plate goes beside the text and the callouts appear. */
const LG = "(min-width: 1024px)";

/** Room the callout column needs right of the plate: a w-64 label and its gutter. */
const COLUMN = 300;

function layoutFor(w: number): Layout {
  // Desktop: the plate is centred in what the callout column leaves, so the
  // labels never stand on it at any width. Narrow: it owns its own box, callouts hidden.
  if (window.matchMedia(LG).matches) {
    const region = Math.max(w * 0.45, w - COLUMN);
    return { shiftX: region / w - 1, shiftY: 0.02, availW: (0.94 * region) / w, availH: 0.84 };
  }
  return { shiftX: 0, shiftY: 0, availW: 0.94, availH: 0.9 };
}

export interface JourneyProps {
  chapter: number;
  paused: boolean;
  reduced: boolean;
  /** Called once if the plates fall back to the line drawing. */
  onFallback?: () => void;
  className?: string;
}

interface Row {
  id: string;
  at: V3;
  label: HTMLElement | null;
  line: SVGLineElement | null;
  dot: SVGCircleElement | null;
}

export function Journey({ chapter, paused, reduced, onFallback, className }: JourneyProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const lines = useRef(new Map<string, SVGLineElement>());
  const dots = useRef(new Map<string, SVGCircleElement>());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const still = reduced || paused;
  const init = useRef({ chapter, still });
  // The chapter whose callouts the DOM currently holds — the engine reports
  // which plate is on the turntable, which lags `chapter` mid-transition.
  const [shown, setShown] = useState(chapter);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;
  useEffect(() => {
    if (failed) onFallbackRef.current?.();
  }, [failed]);

  const place = useCallback((project: (p: V3) => [number, number] | null, s: EngineState, ext: Extent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (s.chapter !== shownRef.current) {
      shownRef.current = s.chapter;
      setShown(s.chapter);
      return;
    }
    const wide = window.matchMedia(LG).matches && wrap.clientWidth >= 600;
    const defs = (CALLOUTS[s.chapter] ?? []).map((c) => ({ id: c.id, at: c.at }));
    const rows: Row[] = defs
      .map((d) => ({ ...d, label: labels.current.get(d.id) ?? null, line: lines.current.get(d.id) ?? null, dot: dots.current.get(d.id) ?? null }))
      .filter((r) => r.label && r.line && r.dot);
    const pts = rows.map((r) => ({ r, p: project(r.at) })).filter((x): x is { r: Row; p: [number, number] } => !!x.p);
    pts.sort((a, b) => a.p[1] - b.p[1]);
    // A column right of the plate, in anchor order, each label clear of the
    // one above by its own measured height (cached: the labels' width is fixed).
    const heightOf = (el: HTMLElement) => {
      if (!el.dataset.h && el.offsetHeight) el.dataset.h = String(el.offsetHeight);
      return Number(el.dataset.h || 36);
    };
    const colX = Math.min(wrap.clientWidth - 268, Math.max(ext.right + 32, 0));
    const h = wrap.clientHeight;
    const total = pts.reduce((n, { r }) => n + heightOf(r.label!) + 14, 0);
    let next = Math.max(24, Math.min(pts.length ? pts[0].p[1] - 14 : 0, h - 40 - total));
    const show = wide && s.settle > 0.02;
    for (const { r, p } of pts) {
      const y = Math.min(Math.max(p[1] - 14, next), h - 52);
      next = y + heightOf(r.label!) + 14;
      r.label!.style.transform = `translate(${colX.toFixed(1)}px, ${y.toFixed(1)}px)`;
      r.label!.style.opacity = String(show ? s.settle : 0);
      r.label!.style.visibility = show ? "visible" : "hidden";
      r.line!.setAttribute("x1", p[0].toFixed(1));
      r.line!.setAttribute("y1", p[1].toFixed(1));
      r.line!.setAttribute("x2", String(colX - 6));
      r.line!.setAttribute("y2", (y + 9).toFixed(1));
      r.line!.style.opacity = String(show ? s.settle : 0);
      r.dot!.setAttribute("cx", p[0].toFixed(1));
      r.dot!.setAttribute("cy", p[1].toFixed(1));
      r.dot!.style.opacity = String(show ? s.settle : 0);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, probe = probeRef.current;
    if (!canvas || !probe) return;
    // `#/learn?gl=off` shows the line drawing on any machine, for review.
    if (/[?&]gl=off\b/.test(window.location.hash)) {
      setFailed(true);
      return;
    }
    let disposed = false;
    let engine: Engine | undefined;
    let mo: MutationObserver | undefined;
    let mq: MediaQueryList | undefined;
    const relayout = () => engine?.relayout();
    import("./gl/engine")
      .then(({ Engine }) => {
        if (disposed) return;
        try {
          engine = new Engine({
            canvas,
            probe,
            chapter: init.current.chapter,
            still: init.current.still,
            layout: layoutFor,
            onFrame: place,
            onReady: () => setReady(true),
            onStats: (fps, dpr) => {
              canvas.dataset.fps = fps.toFixed(0);
              canvas.dataset.dpr = String(dpr);
            },
          });
        } catch {
          setFailed(true);
          return;
        }
        engineRef.current = engine;
        const e = engine;
        mo = new MutationObserver(() => e.refreshPalette());
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        mq = window.matchMedia(LG);
        mq.addEventListener("change", relayout);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      mo?.disconnect();
      mq?.removeEventListener("change", relayout);
      engine?.dispose();
      engineRef.current = null;
      // Release the context only once the canvas has really gone — StrictMode
      // remounts onto the same element, and a lost context cannot be reused.
      setTimeout(() => {
        if (!canvas.isConnected) canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    };
  }, [place]);

  useEffect(() => engineRef.current?.setChapter(chapter), [chapter]);
  useEffect(() => engineRef.current?.setStill(still), [still]);

  const callouts = CALLOUTS[shown] ?? null;

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full", className)}>
      <span ref={probeRef} aria-hidden="true" className="pointer-events-none absolute size-0 overflow-hidden" />
      {failed ? (
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center p-8 lg:py-20 lg:pr-[30%]">
          <Fallback />
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={cn(
              "absolute inset-0 size-full",
              !reduced && "transition-opacity duration-slower ease-out",
              ready ? "opacity-100" : "opacity-0",
            )}
          />
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block">
            {(callouts ?? []).map((c) => c.id).map((id) => (
              <g key={`${shown}-${id}`}>
                <line
                  ref={(el) => {
                    if (el) lines.current.set(id, el);
                    else lines.current.delete(id);
                  }}
                  className="stroke-muted-foreground"
                  strokeWidth={0.75}
                  style={{ opacity: 0 }}
                />
                <circle
                  ref={(el) => {
                    if (el) dots.current.set(id, el);
                    else dots.current.delete(id);
                  }}
                  r={2.75}
                  className="fill-card stroke-primary"
                  strokeWidth={1.25}
                  style={{ opacity: 0 }}
                />
              </g>
            ))}
          </svg>
          {callouts && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
              {callouts.map((c) => (
                <div
                  key={`${shown}-${c.id}`}
                  ref={(el) => {
                    if (el) labels.current.set(c.id, el);
                    else labels.current.delete(c.id);
                  }}
                  className="absolute left-0 top-0 w-64 opacity-0"
                  style={{ visibility: "hidden" }}
                >
                  <p className="font-serif text-sm italic leading-tight text-foreground">{c.title}</p>
                  <p className="mt-0.5 text-2xs uppercase tracking-wider text-muted-foreground">{c.spec}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
