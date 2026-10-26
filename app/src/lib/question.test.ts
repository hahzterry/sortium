import { expect, test } from "bun:test";
import { displayQuestion } from "./question";

const noon = Date.UTC(2026, 9, 13, 12, 0, 0) / 1000;

test("chart markets display a readable question for club music genres", () => {
  const market = {
    templateKey: "AM_TOP_CLUB_TRACK",
    question:
      "Which song will be #1 on Apple Music US at 2026-10-13 12:00 UTC?",
    resolveTime: noon,
    demo: false,
    meta: { cc: "us" },
  };

  expect(displayQuestion(market)).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in the United States on Oct 13 (12:00 UTC)?"
  );
});

test("demo markets remove the demo prefix and include the resolution time", () => {
  const market = {
    templateKey: "AM_CLUB_NEW_RELEASE",
    question: "[demo] x",
    resolveTime: noon + 300,
    demo: true,
    meta: { cc: "us" },
  };

  expect(displayQuestion(market)).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in the United States at 12:05 UTC?"
  );
});

test("short headlines omit the date when it is displayed elsewhere", () => {
  const market = {
    templateKey: "AM_TOP_CLUB_TRACK",
    question: "x",
    resolveTime: noon,
    demo: false,
    meta: { cc: "gb" },
  };

  expect(displayQuestion(market, { short: true })).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in the United Kingdom?"
  );
});

test("YouTube chart and other market templates display correctly", () => {
  expect(
    displayQuestion({
      templateKey: "YT_TOP_VIEW_VELOCITY",
      question: "q",
      resolveTime: noon,
      demo: false,
      meta: { region: "us" },
    })
  ).toBe("Which Jersey, Bmore, or Philly club video will top YouTube in the United States on Oct 13 (12:00 UTC)?");

  expect(
    displayQuestion({
      templateKey: "YT_VIEWS_24H",
      question: "How many views?",
      resolveTime: noon,
      demo: false,
      meta: {},
    })
  ).toBe("How many views?");
});

test("English questions use the correct country names and grammar", () => {
  const market = (cc: string) => ({
    templateKey: "AM_TOP_CLUB_TRACK",
    question: "x",
    resolveTime: noon,
    demo: false,
    meta: { cc },
  });

  expect(displayQuestion(market("us"), { short: true })).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in the United States?"
  );

  expect(displayQuestion(market("gb"), { short: true })).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in the United Kingdom?"
  );

  expect(displayQuestion(market("de"), { short: true })).toBe(
    "Which Jersey, Bmore, or Philly club track will top Apple Music in Germany?"
  );

  expect(
    displayQuestion(
      {
        templateKey: "YT_TOP_VIEW_VELOCITY",
        question: "q",
        resolveTime: noon,
        demo: false,
        meta: { region: "kr" },
      },
      { short: true }
    )
  ).toBe("Which Jersey, Bmore, or Philly club video will top YouTube in South Korea?");

  expect(
    displayQuestion(
      {
        templateKey: "AM_CLUB_NEW_RELEASE",
        question: "x",
        resolveTime: noon + 300,
        demo: true,
        meta: { cc: "us" },
      }
    )
  ).toBe("Which Jersey, Bmore, or Philly club track will top Apple Music in the United States at 12:05 UTC?");
});

test("view-count questions are rebuilt from stored English text", () => {
  const question =
    'How many views will "Rumpshaker" by DJ Taj have 24h after publishing?';

  expect(
    displayQuestion(
      {
        templateKey: "YT_VIEWS_24H",
        question,
        resolveTime: noon,
        demo: false,
        meta: {},
      }
    )
  ).toBe('How many views will "Rumpshaker" by DJ Taj have 24h after publishing?');
});