/**
 * Learn — "The drilling journey": an introduction to
 * drilling for anyone new to the Drilling & Workover Engineering Group, in
 * F·E·I's design language (landing/fei3).
 *
 * Saud, 2026-10-25: "a page for introduction/learning on drilling and
 * drilling equipment while using the design language of the rig to make the
 * animations / 3d models … in chapters … the journey of oil discovery, then
 * the rig, Kuwait formations, fields etc, and then the drilling part and its
 * components."
 *
 *   sidebar    the hub's header and styles (landing/rig3), with a way home
 *              and the chapters nested under the journey — no dashboards
 *              (Saud, 2026-10-25; see Sidebar.tsx)
 *   masthead   the hub's: F·E·I's staggered blue title at the head of the main column
 *   chapters   six, each a run of text steps beside one sticky plate; the
 *              reader's scroll moves the plate from view to view
 *   close      check yourself, terms, sources
 *
 * Routes: `#/learn`, and `#/learn/<chapter>` opens at a chapter (for the
 * hub's sidebar). Copied from fei3/if3, never imported: the directions stay
 * untouched.
 */

import "./learn.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, X } from "lucide-react";

import { cn } from "@/koc";

import { CHAPTERS, QUIZ, type ChapterDef, type Step } from "./content";
import { BitFigure, ColumnFigure } from "./figures";
import { Plate, type PlateView } from "./Plate";
import { Sidebar } from "./Sidebar";

const PREFIX = "learn";


const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Every step on the page, in reading order, with the chapter it belongs to. */
interface FlatStep extends Step {
  key: string;
  chapter: ChapterDef | null;
  index: number;
}

const HERO_STEP: FlatStep = { key: "hero", view: "hero", eyebrow: "", title: "", body: [], chapter: null, index: 0 };

function viewOf(view: string): PlateView {
  return view.startsWith("history:") ? { kind: "history", chapter: Number(view.slice(8)) } : { kind: "scene", stop: view };
}

function reducedNow() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.forceReducedMotion === "true";
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedNow() ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

export default function LearnPage({ chapter: initial }: { chapter?: string }) {
  const steps = useMemo<FlatStep[]>(
    () => [HERO_STEP, ...CHAPTERS.flatMap((c) => c.steps.map((s, i) => ({ ...s, key: `${c.id}-${i}`, chapter: c, index: i })))],
    [],
  );
  const [active, setActive] = useState(0);
  const stepEls = useRef<(HTMLElement | null)[]>([]);

  // The step being read is the last one whose top has passed the reading line:
  // mid-screen beside the plate on desktop, below the plate on a phone.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const line = window.innerHeight * (wide ? 0.55 : 0.72);
      let i = 0;
      stepEls.current.forEach((el, k) => {
        if (el && el.getBoundingClientRect().top < line) i = k;
      });
      setActive(i);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Deep link: #/learn/<chapter> opens there.
  useEffect(() => {
    if (initial && CHAPTERS.some((c) => c.id === initial)) requestAnimationFrame(() => document.getElementById(`learn-${initial}`)?.scrollIntoView({ block: "start" }));
  }, [initial]);

  const step = steps[active];
  const [inCheck, setInCheck] = useState(false);
  const chapterIdx = inCheck ? CHAPTERS.length : step.chapter ? CHAPTERS.indexOf(step.chapter) : -1;
  // The questions sit below the last plate; the sidebar marks them once they fill the reading line.
  useEffect(() => {
    const el = document.getElementById("learn-check");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInCheck(e.isIntersecting), { rootMargin: "-45% 0px -45% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    document.title = "The drilling journey — DWEG";
  }, []);
  // The journey plates are built once chapter 01 is near, and kept.
  const [historyArmed, setHistoryArmed] = useState(false);
  useEffect(() => {
    if (active >= 1) setHistoryArmed(true);
  }, [active]);
  useEffect(() => {
    const t = window.setTimeout(() => setHistoryArmed(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  const caption = step.chapter
    ? `${step.chapter.numeral}.${step.index + 1} — ${step.eyebrow}`
    : "Plate 00 — An illustrative land rig, in its field";

  return (
    <div className="learn-page flex min-h-svh flex-col text-foreground lg:flex-row">
      {/* First tab stop. A button, not href="#…": the app is hash-routed. */}
      <button
        type="button"
        onClick={() => scrollToId("learn-discovery")}
        className={cn("sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50", FOCUS_RING)}
      >
        Skip to chapter 01
      </button>
      <Sidebar prefix={PREFIX} activeChapter={chapterIdx} onChapter={scrollToId} />
      <div className="min-w-0 flex-1">
        <div className="grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {/* The plate: sticky beside the text on desktop, above it on a phone. */}
          <div className="sticky top-0 z-10 h-[44svh] border-b border-border bg-background lg:order-last lg:h-auto lg:border-b-0 lg:bg-transparent">
            <div className="h-full lg:sticky lg:top-0 lg:h-svh">
              <Plate view={viewOf(step.view)} caption={caption} historyArmed={historyArmed} />
            </div>
          </div>

          <main className="min-w-0 px-4 sm:px-8">
            <Hero ref={(el) => (stepEls.current[0] = el)} />
            {CHAPTERS.map((c) => (
              <Chapter key={c.id} chapter={c} register={(i, el) => (stepEls.current[steps.findIndex((s) => s.key === `${c.id}-${i}`)] = el)} activeKey={step.key} />
            ))}
          </main>
        </div>
        <CheckYourself />
        <PageFooter />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Hero                                                                      */

/** Staggered like the hub's "Drilling & / Workover / Engineering / — Group". */
const WORDMARK = [
  { text: "The", indent: "" },
  { text: "drilling", indent: "pl-[1.1em]" },
  { text: "— journey", indent: "" },
];

function Hero({ ref }: { ref: (el: HTMLElement | null) => void }) {
  return (
    <section ref={ref} aria-labelledby="learn-title" className="flex min-h-svh flex-col justify-center py-12 lg:pr-4">
      <p className="font-mono text-xs text-muted-foreground">
        00 <span aria-hidden="true">—</span> Drilling &amp; Workover Engineering Group · Learning
      </p>
      <h1 id="learn-title" className="mt-5 text-[clamp(2.75rem,4.4vw,5.75rem)] font-medium uppercase leading-[0.86] tracking-[-0.04em] text-primary">
        {WORDMARK.map((l) => (
          <span key={l.text} className={cn("block whitespace-nowrap", l.indent)}>
            {l.text}
          </span>
        ))}
      </h1>
      <p className="mt-8 max-w-[34rem] text-md leading-relaxed text-foreground/85">
        An introduction for anyone new to drilling: how oil was found in Kuwait, what a drilling rig is made of, the rock under our
        feet and the fields it holds, and how a well is drilled — down to the bit. Scroll, and the plate beside the text follows
        you; the chapters are in the sidebar.
      </p>
      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="size-3.5" aria-hidden="true" /> About 20 minutes to read. Every figure in the drawings describes an
        illustrative rig and well, not a KOC asset.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* A chapter                                                                 */

function Chapter({ chapter: c, register, activeKey }: { chapter: ChapterDef; register: (i: number, el: HTMLElement | null) => void; activeKey: string }) {
  return (
    <section id={`learn-${c.id}`} tabIndex={-1} aria-labelledby={`learn-${c.id}-title`} className="border-t border-border pt-16 outline-none lg:pr-4">
      <p className="font-mono text-xs text-muted-foreground">
        {c.numeral} <span aria-hidden="true">—</span> Chapter
      </p>
      <h2 id={`learn-${c.id}-title`} className="mt-4 text-[clamp(2.1rem,3vw,3.75rem)] font-medium uppercase leading-[0.88] tracking-[-0.04em] text-primary">
        {c.wordmark.map((l, i) => (
          <span key={l} className={cn("block whitespace-nowrap", i % 2 === 1 && "pl-[1.2em]")}>
            {l}
          </span>
        ))}
      </h2>
      <p className="mt-6 max-w-[34rem] text-md leading-relaxed text-foreground/85">{c.lede}</p>
      <div className="mt-4">
        {c.steps.map((s, i) => (
          <StepBlock key={i} step={s} chapter={c} index={i} active={activeKey === `${c.id}-${i}`} register={(el) => register(i, el)} />
        ))}
      </div>
      <details className="mb-16 max-w-[34rem] text-xs text-muted-foreground">
        <summary className={cn("cursor-pointer rounded-sm py-1 font-medium text-foreground", FOCUS_RING)}>Sources for chapter {c.numeral}</summary>
        <ul className="mt-2 space-y-1.5">
          {c.sources.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className={cn("inline-flex items-baseline gap-1 rounded-sm underline-offset-2 hover:text-foreground hover:underline", FOCUS_RING)}>
                {s.label}
                <ArrowUpRight className="size-3 shrink-0 self-center" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function StepBlock({ step: s, chapter: c, index, active, register }: { step: Step; chapter: ChapterDef; index: number; active: boolean; register: (el: HTMLElement | null) => void }) {
  return (
    <article ref={register} aria-labelledby={`learn-${c.id}-${index}`} className="flex min-h-[78svh] flex-col justify-center py-12 lg:min-h-[86svh]">
      <div className={cn("max-w-[34rem] border-l-2 pl-5 transition-colors duration-slow ease-out", active ? "border-primary" : "border-border")}>
        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          {c.numeral}.{index + 1} <span aria-hidden="true">—</span> {s.eyebrow}
        </p>
        <h3 id={`learn-${c.id}-${index}`} className="mt-2 text-2xl font-medium leading-tight tracking-[-0.02em]">
          {s.title}
        </h3>
        {s.body.map((p, i) => (
          <p key={i} className="mt-4 text-base leading-relaxed text-foreground/85">
            {p}
          </p>
        ))}
        {s.list && (
          <ol className="mt-5 space-y-3 border-l border-border pl-4">
            {s.list.map((l) => (
              <li key={l.label} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm">
                <span className="font-mono text-xs leading-5 text-primary">{l.label}</span>
                <span className="text-foreground/85">{l.text}</span>
              </li>
            ))}
          </ol>
        )}
        {s.figure === "column" && <ColumnFigure className="mt-6" />}
        {s.figure === "bits" && <BitFigure className="mt-6" />}
        {s.terms && (
          <dl className="mt-6 space-y-2.5 rounded-md border border-border bg-card/60 p-4">
            {s.terms.map(([t, d]) => (
              <div key={t} className="text-sm">
                <dt className="inline font-serif italic text-foreground">{t}</dt>
                <span aria-hidden="true" className="text-muted-foreground">
                  {" "}
                  —{" "}
                </span>
                <dd className="inline text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* Check yourself                                                            */

function CheckYourself() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const right = Object.entries(picked).filter(([q, a]) => QUIZ[Number(q)].answer === a).length;
  const answered = Object.keys(picked).length;
  const reset = useCallback(() => setPicked({}), []);
  return (
    <section id="learn-check" tabIndex={-1} aria-labelledby="learn-check-title" className="border-t border-border outline-none">
      <div className="px-4 py-16 sm:px-8">
        <p className="font-mono text-xs text-muted-foreground">
          07 <span aria-hidden="true">—</span> Check yourself
        </p>
        <h2 id="learn-check-title" className="mt-4 text-[clamp(2rem,3.6vw,3.5rem)] font-medium uppercase leading-[0.9] tracking-[-0.04em] text-primary">
          <span className="block">Seven</span>
          <span className="block pl-[1.2em]">— questions</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
          {answered === 0 ? "One question for each idea. Pick an answer to see why." : `${right} of ${answered} right so far.`}
          {answered > 0 && (
            <button type="button" onClick={reset} className={cn("ml-3 rounded-sm text-foreground underline underline-offset-2", FOCUS_RING)}>
              Start again
            </button>
          )}
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {QUIZ.map((q, qi) => {
            const chosen = picked[qi];
            const done = chosen !== undefined;
            const chapter = CHAPTERS.find((c) => c.id === q.chapter)!;
            return (
              <li key={qi} className="flex flex-col rounded-md border border-border bg-card p-5">
                <fieldset>
                  <legend className="text-sm font-medium leading-snug">
                    <span className="mr-2 font-mono text-xs text-primary">{chapter.numeral}</span>
                    {q.q}
                  </legend>
                  <div className="mt-4 space-y-2">
                    {q.options.map((o, oi) => {
                      const isRight = oi === q.answer;
                      const isChosen = chosen === oi;
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={done}
                          aria-pressed={isChosen}
                          onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors duration-fast ease-out",
                            FOCUS_RING,
                            !done && "border-input hover:bg-accent",
                            done && isRight && "border-primary bg-primary/10 text-foreground",
                            done && isChosen && !isRight && "border-destructive/60 bg-destructive/5",
                            done && !isChosen && !isRight && "border-border text-muted-foreground",
                          )}
                        >
                          <span className="flex-1">{o}</span>
                          {done && isRight && <Check className="size-4 text-primary" aria-label="Correct answer" />}
                          {done && isChosen && !isRight && <X className="size-4 text-destructive" aria-label="Your answer, incorrect" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                {done && <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">{q.why}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function PageFooter() {
  return (
    <footer className="border-t border-border">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-8 text-xs text-muted-foreground sm:px-8">
        <span>
          <span className="font-semibold text-primary">DWEG</span> · Drilling &amp; Workover Engineering Group · Kuwait Oil Company
        </span>
        <span className="italic">
          The rig, the well and the block are illustrative, built from typical dimensions. The map is schematic. Sources are listed with each chapter.
        </span>
      </div>
    </footer>
  );
}
