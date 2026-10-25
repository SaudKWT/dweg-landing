import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { CHAPTERS, QUIZ } from "../src/learn/content";
import { STOPS } from "../src/learn/gl/stops";

/**
 * The drilling learning page (src/learn), `#/learn`. Correctness, never taste:
 * every step names a view that exists, the chapter bar and deep links land
 * where they say, the plate follows the reading, the questions answer, the
 * page has a drawing at every stop without WebGL, and axe finds nothing.
 *
 * Run just these:  npx playwright test learn
 */

async function openLearn(page: Page, hash = "#/learn") {
  await page.goto(`/${hash}`);
  await page.locator("main h1").waitFor({ state: "attached", timeout: 30_000 });
}

/** Scroll a step into the reading band (55% down on desktop) and give the page a frame to notice. */
async function readStep(page: Page, chapter: string, index: number) {
  const step = page.locator(`#learn-${chapter} article`).nth(index);
  await step.evaluate((el) => window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.3, behavior: "instant" }));
  await page.waitForTimeout(250);
}

test("every step names a view the plate has", () => {
  const ids = new Set(STOPS.map((s) => s.id));
  for (const c of CHAPTERS)
    for (const s of c.steps) {
      if (s.view.startsWith("history:")) expect(Number(s.view.slice(8))).toBeLessThanOrEqual(2);
      else expect(ids, `${c.id}: ${s.view}`).toContain(s.view);
    }
});

test("every chapter cites its sources", () => {
  for (const c of CHAPTERS) {
    expect(c.sources.length, c.id).toBeGreaterThan(0);
    for (const s of c.sources) expect(s.href, s.label).toMatch(/^https?:\/\//);
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`axe: no violations (${theme})`, async ({ page }) => {
    await openLearn(page);
    // The page has no theme switch of its own (nor does the hub): the app's `dark` class drives it.
    if (theme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      // Asserted at the token level in the design system.
      .disableRules(["color-contrast"])
      .analyze();
    const detail = results.violations
      .map((v) => `\n  [${v.impact}] ${v.id} — ${v.help}\n` + v.nodes.map((n) => `      ${n.target.join(" ")}`).join("\n"))
      .join("");
    expect(results.violations, detail).toEqual([]);
  });
}

test("the sidebar has a way home and the chapters, and no dashboards", async ({ page }) => {
  await openLearn(page);
  const side = page.getByRole("complementary", { name: "Field guide" });
  await expect(side.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "#/landing/rig3");
  await expect(side.getByRole("link", { name: /home/ }).first()).toHaveAttribute("href", "#/landing/rig3");
  await expect(side.getByRole("searchbox")).toHaveCount(0);
  await expect(side.getByRole("navigation", { name: "Teams" })).toHaveCount(0);
  const guide = side.getByRole("navigation", { name: "Learn" }).getByRole("button", { name: /The drilling journey/ });
  await expect(guide).toHaveAttribute("aria-expanded", "true");
  await guide.click();
  await expect(side.getByRole("button", { name: /Discovery/ })).toBeHidden();
  await guide.click();
  await expect(side.getByRole("button", { name: /Discovery/ })).toBeVisible();
});

test("the sidebar goes to each chapter and marks it", async ({ page }) => {
  await openLearn(page);
  const learn = page.getByRole("navigation", { name: "Learn" });
  for (const c of CHAPTERS) {
    const item = learn.getByRole("button", { name: new RegExp(`${c.numeral}\\s*${c.name}`) });
    await item.click();
    await expect(page.locator(`#learn-${c.id}`)).toBeFocused();
    await page.waitForTimeout(900);
    await readStep(page, c.id, 0);
    await expect(item).toHaveAttribute("aria-current", "location");
  }
  await learn.getByRole("button", { name: /Check yourself/ }).click();
  await expect(page.locator("#learn-check")).toBeFocused();
});

test("the plate follows the step being read", async ({ page }) => {
  await openLearn(page);
  for (const c of CHAPTERS) {
    const last = c.steps.length - 1;
    await readStep(page, c.id, last);
    await expect(page.getByText(`${c.numeral}.${last + 1} — ${c.steps[last].eyebrow}`, { exact: true }).first()).toBeVisible();
  }
});

test("a deep link opens at its chapter", async ({ page }) => {
  await openLearn(page, "#/learn/fields");
  await page.waitForTimeout(600);
  const top = await page.locator("#learn-fields").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(80);
});

test("questions show the answer and why", async ({ page }) => {
  await openLearn(page);
  const first = page.locator("#learn-check li").first();
  await first.getByRole("button", { name: QUIZ[0].options[QUIZ[0].answer] }).click();
  await expect(first.getByText(QUIZ[0].why)).toBeVisible();
  await expect(page.getByText("1 of 1 right so far.")).toBeVisible();
  await expect(first.getByRole("button").first()).toBeDisabled();
});

test("without WebGL every stop still has a drawing", async ({ page }) => {
  await openLearn(page, "#/learn?gl=off");
  await page.waitForTimeout(400);
  const plate = page.locator(".learn-plate");
  for (const c of CHAPTERS.slice(1))
    for (let i = 0; i < c.steps.length; i++) {
      await readStep(page, c.id, i);
      await expect(plate.locator("svg").first(), `${c.id} ${i}`).toBeVisible();
    }
});

test("no sideways scroll on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openLearn(page);
  await page.waitForTimeout(400);
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
});
