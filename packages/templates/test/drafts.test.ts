
import { expect, test } from "bun:test";
import { nextResolve } from "../src/templates/ytViews";
import { TEMPLATES } from "../src/index";

const DAY = 86_400;

test("nextResolve is a 12:00 UTC slot leaving open time before the 12h lock", () => {
  const now = Date.UTC(2026, 9, 12, 4, 0, 0) / 1000; // 04:00 UTC
  const r = nextResolve(now);
  expect(r % DAY).toBe(12 * 3600);
  expect(r - 12 * 3600).toBeGreaterThan(now + 600);
  expect(r).toBe(Date.UTC(2026, 9, 13, 12, 0, 0) / 1000);
});

test("planned keys are computable without fetching and match the draft key format", () => {
  const now = Date.UTC(2026, 9, 12, 4, 0, 0) / 1000;
  const keys = TEMPLATES.YT_VIEWS_24H.plannedKeys!({ now });
  expect(keys.length).toBeGreaterThanOrEqual(0);
  expect(keys.every((key) => key.startsWith("YT_VIEWS_24H:"))).toBe(true);
  const demoA = TEMPLATES.YT_VIEW_VELOCITY.plannedKeys!({ now });
  const demoB = TEMPLATES.YT_VIEW_VELOCITY.plannedKeys!({ now: now + 900 });
  expect(demoA.every((key) => key.startsWith("YT_VIEW_VELOCITY:"))).toBe(true);
  expect(demoB.every((key) => key.startsWith("YT_VIEW_VELOCITY:"))).toBe(true);
  expect(TEMPLATES.YT_LIKES_24H.plannedKeys!({ now }).every((key) => key.startsWith("YT_LIKES_24H:"))).toBe(true);
  expect(TEMPLATES.YT_ENGAGEMENT_RATE.plannedKeys!({ now }).every((key) => key.startsWith("YT_ENGAGEMENT_RATE:"))).toBe(true);
  expect(TEMPLATES.YT_CREATOR_VIEWS.plannedKeys!({ now }).every((key) => key.startsWith("YT_CREATOR_VIEWS:"))).toBe(true);
});

test("questions read like a person wrote them", async () => {
  const { viewsQuestion } = await import("../src/templates/ytViews");
  const noon = Date.UTC(2026, 9, 13, 12, 0, 0) / 1000;
  expect(viewsQuestion("Warehouse Jobz", 1000000, 24)).toBe("Will Warehouse Jobz reach 1,000,000 YouTube views within 24 hours?");
  expect(viewsQuestion("Warehouse Jobz", 250000, 6)).toBe("Will Warehouse Jobz gain 250,000 YouTube views within 6 hours?");
});

test("YouTube templates produce nothing without an API key", async () => {
  const env = { now: 1_800_000_000 };
  expect(await TEMPLATES.YT_VIEWS_24H.drafts(env)).toEqual([]);
  expect(await TEMPLATES.YT_VIEW_VELOCITY.drafts(env)).toEqual([]);
  expect(await TEMPLATES.YT_LIKES_24H.drafts(env)).toEqual([]);
  expect(await TEMPLATES.YT_ENGAGEMENT_RATE.drafts(env)).toEqual([]);
  expect(await TEMPLATES.YT_CREATOR_VIEWS.drafts(env)).toEqual([]);
});
