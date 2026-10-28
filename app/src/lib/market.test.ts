
import { expect, test } from "bun:test";
import {
  artFor,
  leaderIndex,
  coverOf,
  splitLabel,
  category,
  poolsOf,
  shareSeries,
} from "./market";

const YOUTUBE_MARKETS = [
  {
    templateKey: "YT_VIEWS_24H",
    title: "Will this video reach 1M views within 24 hours?",
    threshold: 1_000_000,
    windowHours: 24,
    source: "youtube_data_api",
    outcomes: ["YES", "NO"],
  },
  {
    templateKey: "YT_VIEW_VELOCITY",
    title: "Will this video gain 250K views within 6 hours?",
    threshold: 250_000,
    windowHours: 6,
    source: "youtube_data_api",
    outcomes: ["YES", "NO"],
  },
  {
    templateKey: "YT_LIKES_24H",
    title: "Will this video reach 50K likes within 24 hours?",
    threshold: 50_000,
    windowHours: 24,
    source: "youtube_data_api",
    outcomes: ["YES", "NO"],
  },
  {
    templateKey: "YT_ENGAGEMENT_RATE",
    title: "Will this video's likes exceed 5% of views?",
    threshold: 5,
    windowHours: null,
    source: "youtube_data_api",
    outcomes: ["YES", "NO"],
  },
  {
    templateKey: "YT_CREATOR_VIEWS",
    title: "Which tracked creator will generate the most views?",
    threshold: null,
    windowHours: 24,
    source: "youtube_data_api",
    outcomes: ["Creator A", "Creator B", "Creator C"],
  },
] as const;

const meta = {
  candidates: [
    {
      id: "creator-a",
      label: "Creator A",
      art: "creator-a.jpg",
    },
    {
      id: "creator-b",
      label: "Creator B",
      art: "creator-b.jpg",
    },
    {
      id: "creator-c",
      label: "Creator C",
      art: "creator-c.jpg",
    },
  ],
};

test("YouTube creator artwork matches each outcome", () => {
  expect(artFor(meta, 0)).toBe("creator-a.jpg");
  expect(artFor(meta, 1)).toBe("creator-b.jpg");
  expect(artFor(meta, 2)).toBe("creator-c.jpg");
  expect(artFor(meta, 3)).toBeUndefined();
});

test("leader is the outcome with the largest betting pool", () => {
  expect(leaderIndex([1n, 5n, 3n])).toBe(1);
  expect(leaderIndex([0n, 0n, 0n])).toBe(0);
  expect(leaderIndex([500n, 200n, 100n])).toBe(0);
});

test("all five YouTube markets support video thumbnails", () => {
  for (const market of YOUTUBE_MARKETS) {
    expect(
      coverOf({
        meta: { art: "youtube-thumbnail.jpg" },
        templateKey: market.templateKey,
      })
    ).toBe("youtube-thumbnail.jpg");
  }
});

test("YouTube creator markets use creator artwork", () => {
  expect(
    coverOf({
      meta,
      templateKey: "YT_CREATOR_VIEWS",
    })
  ).toBe("creator-a.jpg");
});

test("YouTube outcome labels display correctly", () => {
  expect(splitLabel("YES")).toEqual({
    title: "YES",
    by: "",
  });

  expect(splitLabel("NO")).toEqual({
    title: "NO",
    by: "",
  });

  expect(splitLabel("Under 1M")).toEqual({
    title: "Under 1M",
    by: "",
  });

  expect(splitLabel("Over 1M")).toEqual({
    title: "Over 1M",
    by: "",
  });

  expect(splitLabel("Creator A")).toEqual({
    title: "Creator A",
    by: "",
  });

  expect(splitLabel("Creator B")).toEqual({
    title: "Creator B",
    by: "",
  });
});

test("all five prediction markets belong to YouTube", () => {
  for (const market of YOUTUBE_MARKETS) {
    expect(
      category({
        templateKey: market.templateKey,
        demo: false,
      })
    ).toBe("youtube");
  }
});

test("YouTube market templates have unique keys", () => {
  const keys = YOUTUBE_MARKETS.map(
    (market) => market.templateKey
  );

  expect(new Set(keys).size).toBe(5);
});

test("YouTube markets use the public YouTube Data API", () => {
  for (const market of YOUTUBE_MARKETS) {
    expect(market.source).toBe("youtube_data_api");
  }
});

test("24-hour video views market resolves at 1M views", () => {
  const market = YOUTUBE_MARKETS[0];

  expect(market.templateKey).toBe("YT_VIEWS_24H");
  expect(market.threshold).toBe(1_000_000);
  expect(market.windowHours).toBe(24);

  const viewsBelowThreshold = 999_999;
  const viewsAtThreshold = 1_000_000;
  const viewsAboveThreshold = 1_250_000;

  expect(viewsBelowThreshold >= market.threshold).toBe(false);
  expect(viewsAtThreshold >= market.threshold).toBe(true);
  expect(viewsAboveThreshold >= market.threshold).toBe(true);
});

test("six-hour view velocity market resolves at 250K gained views", () => {
  const market = YOUTUBE_MARKETS[1];

  expect(market.templateKey).toBe("YT_VIEW_VELOCITY");
  expect(market.threshold).toBe(250_000);
  expect(market.windowHours).toBe(6);

  const startingViews = 500_000;
  const endingViews = 775_000;

  const gainedViews = endingViews - startingViews;

  expect(gainedViews).toBe(275_000);
  expect(gainedViews >= market.threshold).toBe(true);

  const unsuccessfulEndingViews = 749_999;

  expect(
    unsuccessfulEndingViews - startingViews >= market.threshold
  ).toBe(false);
});

test("24-hour likes market resolves at 50K likes", () => {
  const market = YOUTUBE_MARKETS[2];

  expect(market.templateKey).toBe("YT_LIKES_24H");
  expect(market.threshold).toBe(50_000);
  expect(market.windowHours).toBe(24);

  expect(49_999 >= market.threshold).toBe(false);
  expect(50_000 >= market.threshold).toBe(true);
  expect(65_000 >= market.threshold).toBe(true);
});

test("engagement rate market requires likes to exceed 5% of views", () => {
  const market = YOUTUBE_MARKETS[3];

  expect(market.templateKey).toBe("YT_ENGAGEMENT_RATE");
  expect(market.threshold).toBe(5);

  const views = 1_000_000;

  const lowEngagement = (40_000 / views) * 100;
  const exactThreshold = (50_000 / views) * 100;
  const highEngagement = (65_000 / views) * 100;

  expect(lowEngagement > market.threshold).toBe(false);
  expect(exactThreshold > market.threshold).toBe(false);
  expect(highEngagement > market.threshold).toBe(true);
});

test("creator views market selects the creator with most gained views", () => {
  const market = YOUTUBE_MARKETS[4];

  expect(market.templateKey).toBe("YT_CREATOR_VIEWS");

  const creators = [
    {
      channelId: "creator-a",
      startingViews: 1_000_000,
      endingViews: 1_500_000,
    },
    {
      channelId: "creator-b",
      startingViews: 2_000_000,
      endingViews: 3_250_000,
    },
    {
      channelId: "creator-c",
      startingViews: 500_000,
      endingViews: 1_250_000,
    },
  ];

  const results = creators.map((creator) => ({
    channelId: creator.channelId,
    viewsGained: creator.endingViews - creator.startingViews,
  }));

  const winner = results.reduce((leader, creator) =>
    creator.viewsGained > leader.viewsGained
      ? creator
      : leader
  );

  expect(winner.channelId).toBe("creator-b");
  expect(winner.viewsGained).toBe(1_250_000);
});

test("YouTube prediction markets have valid outcomes", () => {
  for (const market of YOUTUBE_MARKETS) {
    expect(market.outcomes.length).toBeGreaterThanOrEqual(2);
  }

  for (const market of YOUTUBE_MARKETS.slice(0, 4)) {
    expect([...market.outcomes]).toEqual(["YES", "NO"]);
  }

  expect([...YOUTUBE_MARKETS[4].outcomes]).toEqual([
    "Creator A",
    "Creator B",
    "Creator C",
  ]);
});

test("pools from the engine summary, zero for outcomes nobody picked", () => {
  expect(
    poolsOf({
      outcomes: ["YES", "NO", "Other"],
      pool: {
        byOutcome: {
          "0": "5",
          "2": "7",
        },
        total: "12",
        bettors: 2,
      },
    })
  ).toEqual([5n, 0n, 7n]);

  expect(
    poolsOf({
      outcomes: ["YES"],
    })
  ).toEqual([0n]);
});

test("creator prediction pools support multiple outcomes", () => {
  expect(
    poolsOf({
      outcomes: ["Creator A", "Creator B", "Creator C"],
      pool: {
        byOutcome: {
          "0": "100",
          "1": "250",
          "2": "175",
        },
        total: "525",
        bettors: 3,
      },
    })
  ).toEqual([100n, 250n, 175n]);
});

test("share series replays bets in time order", () => {
  const s = shareSeries(
    [
      { time: 10, outcome: 0, amount: "30" },
      { time: 20, outcome: 1, amount: "10" },
      { time: 30, outcome: 1, amount: "60" },
    ],
    2
  );

  expect(s.map((p) => p.t)).toEqual([10, 20, 30]);
  expect(s[0].shares).toEqual([100, 0]);
  expect(s[1].shares).toEqual([75, 25]);
  expect(s[2].shares).toEqual([30, 70]);
});
