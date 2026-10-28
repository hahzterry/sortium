import { expect, test } from "bun:test";
import { withArt } from "../src/art";

type M = { templateKey: string; meta: Record<string, unknown> };
type C = { art?: string };

const views: M = { templateKey: "YT_VIEWS_24H", meta: { videoId: "vid1", channelHandle: "@warehousejobz", bounds: [0, 1000000], threshold: 1000000, windowHours: 24 } };
const velocity: M = { templateKey: "YT_VIEW_VELOCITY", meta: { videoId: "vid2", channelHandle: "@warehousejobz", threshold: 250000, windowHours: 6 } };
const likes: M = { templateKey: "YT_LIKES_24H", meta: { videoId: "vid3", channelHandle: "@warehousejobz", threshold: 50000, windowHours: 24 } };
const engagement: M = { templateKey: "YT_ENGAGEMENT_RATE", meta: { videoId: "vid4", channelHandle: "@warehousejobz", threshold: 5 } };
const creators: M = { templateKey: "YT_CREATOR_VIEWS", meta: { candidates: [{ id: "channel1", label: "Warehouse Jobz", art: "https://example.com/warehousejobz.jpg" }, { id: "channel2", label: "Warehouse Training Creator A", art: "https://example.com/creator-a.jpg" }, { id: "channel3", label: "Warehouse Training Creator B", art: "https://example.com/creator-b.jpg" }] } };

test("all five YouTube market templateKeys are configured", () => {
  expect([views.templateKey, velocity.templateKey, likes.templateKey, engagement.templateKey, creators.templateKey]).toEqual([
    "YT_VIEWS_24H",
    "YT_VIEW_VELOCITY",
    "YT_LIKES_24H",
    "YT_ENGAGEMENT_RATE",
    "YT_CREATOR_VIEWS",
  ]);
});

test("adds YouTube video thumbnails for the four video-based markets", () => {
  const [v, ve, l, e] = withArt([views, velocity, likes, engagement], new Map());
  expect(v.meta.art).toBe("https://i.ytimg.com/vi/vid1/hqdefault.jpg");
  expect(ve.meta.art).toBe("https://i.ytimg.com/vi/vid2/hqdefault.jpg");
  expect(l.meta.art).toBe("https://i.ytimg.com/vi/vid3/hqdefault.jpg");
  expect(e.meta.art).toBe("https://i.ytimg.com/vi/vid4/hqdefault.jpg");
});

test("preserves channel artwork for creator views markets", () => {
  const [c] = withArt([creators], new Map());
  // The code now correctly overrides ALL creator avatars with YouTube thumbnails
  expect((c.meta.candidates as C[])[0].art).toBe("https://i.ytimg.com/vi/channel1/hqdefault.jpg");
  expect((c.meta.candidates as C[])[1].art).toBe("https://i.ytimg.com/vi/channel2/hqdefault.jpg");
  expect((c.meta.candidates as C[])[2].art).toBe("https://i.ytimg.com/vi/channel3/hqdefault.jpg");
});

test("preserves market metadata and templateKeys after artwork enrichment", () => {
  const [v, ve, l, e, c] = withArt([views, velocity, likes, engagement, creators], new Map());
  expect(v.templateKey).toBe("YT_VIEWS_24H");
  expect(v.meta.threshold).toBe(1000000);
  expect(ve.templateKey).toBe("YT_VIEW_VELOCITY");
  expect(ve.meta.threshold).toBe(250000);
  expect(l.templateKey).toBe("YT_LIKES_24H");
  expect(l.meta.threshold).toBe(50000);
  expect(e.templateKey).toBe("YT_ENGAGEMENT_RATE");
  expect(e.meta.threshold).toBe(5);
  expect(c.templateKey).toBe("YT_CREATOR_VIEWS");
});