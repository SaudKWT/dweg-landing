/**
 * The hero: Datum's endless flight over F·E·I's oil field, under F·E·I's title.
 *
 * The title is the page's h1. The canvas is decoration (`aria-hidden`), sits
 * only inside the hero — never under a link, a figure or the search — and is
 * lazy-loaded so the directory and figures never wait on WebGL. Without
 * hardware WebGL2 the hero keeps its title over a still topographic sheet.
 */

import { useEffect, useRef, useState } from "react";

import { cn } from "@/koc";

import { useReducedMotion } from "../shared";
import type { Flyover } from "./gl/flyover";

const WORDMARK = [
  { text: "Drilling &", indent: "" },
  { text: "Workover", indent: "pl-[1.55em]" },
  { text: "Engineering", indent: "" },
  { text: "— Group", indent: "pl-[2.3em]" },
];

export function Hero() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flyRef = useRef<Flyover | null>(null);
  const [failed, setFailed] = useState(false);
  // No pause control here (Saud, 2026-10-25): reduced motion, and the viewer's turtle, still the flight.
  const still = reduced;
  const stillRef = useRef(still);
  stillRef.current = still;

  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage) return;
    if (/[?&]gl=off\b/.test(window.location.hash)) {
      setFailed(true);
      return;
    }
    let disposed = false;
    let fly: Flyover | undefined;
    import("./gl/flyover")
      .then(({ Flyover }) => {
        if (disposed) return;
        try {
          fly = new Flyover({
            canvas,
            tokenRoot: stage,
            still: stillRef.current,
            onStats: (fps, dpr) => {
              canvas.dataset.fps = fps.toFixed(0);
              canvas.dataset.dpr = String(dpr);
            },
          });
          flyRef.current = fly;
        } catch {
          setFailed(true);
        }
      })
      .catch(() => !disposed && setFailed(true));
    return () => {
      disposed = true;
      fly?.dispose();
      flyRef.current = null;
    };
  }, []);

  useEffect(() => flyRef.current?.setStill(still), [still]);

  return (
    <section
      ref={stageRef}
      aria-labelledby="fly3-title"
      className={cn(
        "relative isolate flex min-h-[26rem] flex-1 flex-col overflow-hidden lg:min-h-[13rem] lg:flex-[3]",
        "bg-[radial-gradient(110%_80%_at_70%_30%,color-mix(in_oklab,var(--primary)_8%,var(--background))_0%,var(--background)_70%)]",
      )}
    >
      {failed ? (
        <TopoStill />
      ) : (
        /* The bottom third fades into the page, so the figures sit on the page, not on a hard edge. */
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_bottom,var(--foreground)_68%,transparent)]"
        />
      )}

      {/* The hero's tint and scene both end in the page colour, so no edge shows above the figures. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent to-background" />
      <div className="flex items-start justify-between gap-6 px-4 pt-6 sm:px-8 sm:pt-8">
        <div>
          <h1
            id="fly3-title"
            className="text-[clamp(2.25rem,4.6vw,5.25rem)] font-medium uppercase leading-[0.86] tracking-[-0.04em] text-primary"
          >
            {WORDMARK.map((l) => (
              <span key={l.text} className={cn("block whitespace-nowrap", l.indent)}>
                {l.text}
              </span>
            ))}
          </h1>
        </div>
      </div>
    </section>
  );
}

/** No hardware WebGL2: the same topographic sheet, still, in SVG. */
function TopoStill() {
  const rings = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg aria-hidden="true" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 size-full text-primary opacity-30">
      {rings.map((i) => (
        <ellipse key={i} cx={700} cy={330} rx={60 + i * 55} ry={30 + i * 26} fill="none" stroke="currentColor" strokeWidth={0.8} transform={`rotate(${-8 + i * 1.5} 700 330)`} />
      ))}
      {rings.slice(0, 6).map((i) => (
        <ellipse key={`b${i}`} cx={240} cy={420} rx={40 + i * 45} ry={22 + i * 20} fill="none" stroke="currentColor" strokeWidth={0.8} />
      ))}
    </svg>
  );
}
