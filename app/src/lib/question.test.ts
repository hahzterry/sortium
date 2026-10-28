
import { expect, test } from "bun:test";
import { displayQuestion } from "./question";

const noon = Date.UTC(2026, 9, 13, 12, 0, 0) / 1000;

const channel = {
  name: "Warehouse Jobz",
  handle: "@warehousejobz",
  url: "https://youtube.com/@warehousejobz",
};

const videos = {
  forklift: "Online Forklift Certification Training",
  blueYonder: "Blue Yonder WMS Solutions Analyst Training",
  inventory: "Warehouse Inventory Management Training",
  inbound: "Warehouse Receiving and Inbound Operations",
  outbound: "Warehouse Picking, Packing and Shipping",
};

test("24-hour views market displays Warehouse Jobz forklift training question", () => {
  const question =
    `Will Warehouse Jobz's "${videos.forklift}" video reach 1 million views within 24 hours?`;

  const market = {
    templateKey: "YT_VIEWS_24H",
    question,
    resolveTime: noon,
    demo: false,
    meta: {
      channel: channel.name,
      channelHandle: channel.handle,
      channelUrl: channel.url,
      videoTitle: videos.forklift,
      threshold: 1_000_000,
      windowHours: 24,
    },
  };

  expect(displayQuestion(market)).toBe(question);
});

test("six-hour view velocity market displays Blue Yonder training question", () => {
  const question =
    `Will Warehouse Jobz's "${videos.blueYonder}" video gain 250,000 views within 6 hours?`;

  const market = {
    templateKey: "YT_VIEW_VELOCITY",
    question,
    resolveTime: noon,
    demo: false,
    meta: {
      channel: channel.name,
      channelHandle: channel.handle,
      videoTitle: videos.blueYonder,
      threshold: 250_000,
      windowHours: 6,
    },
  };

  expect(displayQuestion(market)).toBe(question);
});

test("24-hour likes market displays warehouse inventory training question", () => {
  const question =
    `Will Warehouse Jobz's "${videos.inventory}" video reach 50,000 likes within 24 hours?`;

  const market = {
    templateKey: "YT_LIKES_24H",
    question,
    resolveTime: noon,
    demo: false,
    meta: {
      channel: channel.name,
      videoTitle: videos.inventory,
      threshold: 50_000,
      windowHours: 24,
    },
  };

  expect(displayQuestion(market)).toBe(question);
});

test("engagement rate market displays inbound operations question", () => {
  const question =
    `Will likes on Warehouse Jobz's "${videos.inbound}" video exceed 5% of its views at the resolution snapshot?`;

  const market = {
    templateKey: "YT_ENGAGEMENT_RATE",
    question,
    resolveTime: noon,
    demo: false,
    meta: {
      channel: channel.name,
      videoTitle: videos.inbound,
      threshold: 5,
      metric: "likes_to_views_percentage",
    },
  };

  expect(displayQuestion(market)).toBe(question);
});

test("creator views market compares Warehouse Jobz with tracked creators", () => {
  const question =
    "Will Warehouse Jobz generate more new video views than the other tracked warehouse training creators during the next 24 hours?";

  const market = {
    templateKey: "YT_CREATOR_VIEWS",
    question,
    resolveTime: noon,
    demo: false,
    meta: {
      channel: channel.name,
      channelHandle: channel.handle,
      windowHours: 24,
      metric: "views_gained",
    },
  };

  expect(displayQuestion(market)).toBe(question);
});

test("outbound training content supports the views market", () => {
  const question =
    `Will Warehouse Jobz's "${videos.outbound}" video reach 1 million views within 24 hours?`;

  expect(
    displayQuestion({
      templateKey: "YT_VIEWS_24H",
      question,
      resolveTime: noon,
      demo: false,
      meta: {
        channel: channel.name,
        videoTitle: videos.outbound,
        threshold: 1_000_000,
        windowHours: 24,
      },
    })
  ).toBe(question);
});

test("short YouTube headlines remain readable", () => {
  const question =
    `Will "${videos.forklift}" reach 1 million views in 24 hours?`;

  expect(
    displayQuestion(
      {
        templateKey: "YT_VIEWS_24H",
        question,
        resolveTime: noon,
        demo: false,
        meta: {
          channel: channel.name,
          videoTitle: videos.forklift,
        },
      },
      { short: true }
    )
  ).toBe(question);
});

test("demo YouTube markets remove the demo prefix", () => {
  const question =
    `Will Warehouse Jobz's "${videos.forklift}" video reach 1 million views within 24 hours?`;

  expect(
    displayQuestion({
      templateKey: "YT_VIEWS_24H",
      question: `[demo] ${question}`,
      resolveTime: noon + 300,
      demo: true,
      meta: {
        channel: channel.name,
        videoTitle: videos.forklift,
      },
    })
  ).toBe(question);
});

test("all five YouTube market categories display Warehouse Jobz questions", () => {
  const markets = [
    {
      templateKey: "YT_VIEWS_24H",
      question: `Will "${videos.forklift}" reach 1 million views in 24 hours?`,
    },
    {
      templateKey: "YT_VIEW_VELOCITY",
      question: `Will "${videos.blueYonder}" gain 250,000 views in 6 hours?`,
    },
    {
      templateKey: "YT_LIKES_24H",
      question: `Will "${videos.inventory}" reach 50,000 likes in 24 hours?`,
    },
    {
      templateKey: "YT_ENGAGEMENT_RATE",
      question: `Will "${videos.inbound}" exceed a 5% likes-to-views rate?`,
    },
    {
      templateKey: "YT_CREATOR_VIEWS",
      question: "Will Warehouse Jobz lead tracked creators in views gained?",
    },
  ];

  for (const market of markets) {
    expect(
      displayQuestion({
        ...market,
        resolveTime: noon,
        demo: false,
        meta: {
          channel: channel.name,
          channelHandle: channel.handle,
        },
      })
    ).toBe(market.question);
  }
});
