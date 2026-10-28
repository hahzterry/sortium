
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { keccak256, toHex } from "viem";
import { codeHash, rulesHash } from "../src/hash";
import { TEMPLATES } from "../src/index";

test("generated code hashes match the resolver sources on disk", () => {
  for (const t of Object.values(TEMPLATES)) {
    const src = readFileSync(join(import.meta.dir, "..", "src", t.resolveFile), "utf8");
    expect(codeHash(t)).toBe(keccak256(toHex(src)));
  }
});

test("all five YouTube market templates are registered", () => {
  expect(Object.keys(TEMPLATES).sort()).toEqual([
    "YT_VIEWS_24H",
    "YT_VIEW_VELOCITY",
    "YT_LIKES_24H",
    "YT_ENGAGEMENT_RATE",
    "YT_CREATOR_VIEWS",
  ].sort());
});
test("different YouTube resolvers hash differently", () => {
  expect(codeHash(TEMPLATES.YT_VIEWS_24H)).not.toBe(codeHash(TEMPLATES.YT_VIEW_VELOCITY));
  expect(codeHash(TEMPLATES.YT_VIEW_VELOCITY)).not.toBe(codeHash(TEMPLATES.YT_LIKES_24H));
  expect(codeHash(TEMPLATES.YT_LIKES_24H)).not.toBe(codeHash(TEMPLATES.YT_ENGAGEMENT_RATE));
  expect(codeHash(TEMPLATES.YT_ENGAGEMENT_RATE)).not.toBe(codeHash(TEMPLATES.YT_CREATOR_VIEWS));
});
test("rules hash is a 32-byte hex", () => {
  expect(rulesHash(TEMPLATES.YT_VIEWS_24H)).toMatch(/^0x[0-9a-f]{64}$/);
  expect(rulesHash(TEMPLATES.YT_VIEW_VELOCITY)).toMatch(/^0x[0-9a-f]{64}$/);
  expect(rulesHash(TEMPLATES.YT_LIKES_24H)).toMatch(/^0x[0-9a-f]{64}$/);
  expect(rulesHash(TEMPLATES.YT_ENGAGEMENT_RATE)).toMatch(/^0x[0-9a-f]{64}$/);
  expect(rulesHash(TEMPLATES.YT_CREATOR_VIEWS)).toMatch(/^0x[0-9a-f]{64}$/);
});
test("every template has rules and a resolve file", () => {
  for (const t of Object.values(TEMPLATES)) {
    expect(t.rules.length).toBeGreaterThan(50);
    expect(t.resolveFile.startsWith("resolve/")).toBe(true);
  }
});
