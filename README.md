# DWEG landing

A hub page for KOC's **Drilling & Workover Engineering Group (DWEG)**. It brings every team's
engineering dashboards into one page: 8 teams, 28 dashboard links and the group's KPIs. The repo
holds **nine design directions (A–I), each in two rounds, and a third round of three mixes**:

- **v1**, the first round, optimised for first impression. Kept as the backup.
- **v2**, the daily-use rework:
  - a visible search (Ctrl+K);
  - compact KPIs that you see without scrolling;
  - pinned and recent dashboards;
  - all links within about one screen;
  - visuals only in empty space and a large footer.
- **v3**, the mixed round (2026-10-22). Each page takes one direction's page and another's
  showpiece; the two letters say which. All three follow the v2 daily-use rules.
  - **F·E** (`fe3`): F v2's card-style top, closed by E's well tour (rig floor to bit),
    recoloured into F's fog palette.
  - **F·I** (`fi3`): F v2's card-style top, closed by I's exploded PDC bit plate.
  - **I·F** (`if3`): I v2's page, with F's four-chapter journey (the first well at Bahra, 1936,
    to a rig pad today) redrawn as I's clay plates on a turntable instead of F's fog diorama.
  - **F·E·I** (`fei3`): F v2's figures and directory under I's masthead (KOC logo), closed by E's
    whole well tour — rig, well plan, casing, build, BHA, bit — drawn in I's clay and blueprint
    lines, standing in an oil field on a topographic sheet.
  - **Fly** (`fly3`): F·E·I's title over Datum's endless flight across the oil field; every team
    and its dashboards nested in a sidebar ported from the design system's `@koc/sidebar`; the
    figures as Datum's ruled stations underneath. All on one screen.
  - **Rig** (`rig3`): the same page with F·E·I's rig and well tour as the hero.
  - Both: the sidebar starts folded, and scrolling past the first screen opens the highlights into
    detail: the figures in full, then drilling, rate improvement, rig moves, workover and water
    shut-off charts (hand-drawn SVG on the design system's chart tokens; **every number invented**,
    contractors lettered).

Hosted at https://dweg-landing.vercel.app. It opens on A v2, and the bar at the bottom left
switches v1/v2/v3, the direction, dark mode and motion.

> **Every dashboard name, link and figure is a placeholder** (`src/landing/data.ts`). The eight
> teams and their EN codes are real. Replace the placeholders before showing this to a KOC team.

## Self-contained: nothing to install from the design system

This app was built on the [KOC Design System](https://github.com/SaudKWT/koc-design-system), but
it does **not** depend on it at build time or at runtime.
- **Components:** copied into `src/components/ui/` by the shadcn CLI. They are this app's own
  files.
- **Theme:** colours, type, radius and motion live in `src/index.css`.
- **Font:** Inter is bundled through `@fontsource-variable/inter`.

At runtime the page contacts **no server except its own** (verified across all 18 pages), so it
runs on a network with no internet access.

The one link back to the design system is `components.json`. It is used only when someone *chooses*
to update a component:

```bash
# Updates a component from the design system, pinned to commit c45211b (v0.2.0 plus docs).
# Needs read access to the design-system repo.
KOC_REGISTRY_TOKEN=<token> npx shadcn@latest add @koc/button
```

## Run, test, build

```bash
npm ci
npm run dev        # http://localhost:4188
npm test           # 334 Playwright checks: axe, keyboard, layout, motion, and the v2 daily-use rules
npm run build      # → dist/ (static files; serve from any web server)
```

`dist/` is plain static files: an `index.html`, an `assets/` folder, the logo and `diag.html`. Any
web server can host it, IIS included. It needs no server-side code.

## Two decisions to know about

- **The site ignores Windows' "reduce motion" setting.** KOC work PCs report it (Windows
  "Animation effects" off), which stilled every direction. Saud decided on 2026-10-01 that this
  site animates anyway. The turtle button in the bottom bar stops all motion on demand. See
  `src/landing-motion.ts` and the plugin in `vite.config.ts`.
- **`/diag.html`** reports a browser's reduced-motion and GPU state. Use it when someone says the
  animations don't play.

## Where things are

| Path | What |
| --- | --- |
| `src/landing/<a–i>/` | v1 directions |
| `src/landing/<a2–i2>/` | v2 directions (daily use) |
| `src/landing/{fe3,fi3,if3,fei3,fly3,rig3}/` | v3 mixes (each a copy of its sources, so v1 and v2 stay untouched) |
| `src/landing/data.ts` | the shared data every direction renders |
| `src/landing/shared.tsx` | shared behaviour: links that open in a new tab and say so, pins and recents, search, Ctrl+K |
| `src/landing/V2-BRIEF.md` | the v2 brief, with Saud's words |
| `src/koc.ts` | maps the pages' design-system imports onto the installed components |
| `tests/landing.spec.ts` | the test suite |
