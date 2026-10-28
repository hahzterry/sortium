
import { resolveYtCreatorViews } from "../resolve/ytCreatorViews";
import { compact, viewBounds } from "../brackets";
import type { Env, MarketDraft, Template } from "../types";

const API = "https://www.googleapis.com/youtube/v3";
const HOUR = 3600;
const DAY = 86400;

type Channel = {
  id: string;
  snippet?: {
    title: string;
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    videoCount?: string;
  };
};

async function youtube<T>(
  path: string,
  key: string
): Promise<T> {
  const response = await fetch(`${API}/${path}&key=${encodeURIComponent(key)}`);

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const ytCreatorViews: Template = {
  key: "YT_CREATOR_VIEWS",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytCreatorViews.ts",

  rules:
    "Resolve using the cumulative public channel view count reported " +
    "by YouTube Data API channels.list statistics.viewCount at the " +
    "scheduled resolution time. Compare the observed count against " +
    "the four fixed market brackets. Missing channel statistics " +
    "result in a void market and refunded stakes.",

  plannedKeys: (_env: Env): string[] => [],

  async drafts(env: Env): Promise<MarketDraft[]> {
    if (!env.YOUTUBE_API_KEY || !env.YT_CREATORS) return [];

    const drafts: MarketDraft[] = [];

    const channels = env.YT_CREATORS
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.startsWith("UC"));

    for (const channelId of channels) {
      const response = await youtube<{
        items?: Channel[];
      }>(
        `channels?part=snippet,statistics&id=${channelId}`,
        env.YOUTUBE_API_KEY
      );

      const channel = response.items?.[0];

      if (!channel?.snippet) continue;

      const rawViews = channel.statistics?.viewCount;

      if (!rawViews || !/^\d+$/.test(rawViews)) continue;

      const currentViews = Number(rawViews);

      if (!Number.isSafeInteger(currentViews)) continue;

      // Brackets target cumulative channel views.
      const projected = Math.max(1, currentViews);

      let bounds = viewBounds(projected);

      // Ensure the current count is not already in the
      // highest bracket when the market opens.
      if (bounds[2] <= currentViews) {
        const step = Math.max(1000, Math.ceil(currentViews * 0.01));

        bounds = [
          currentViews + step,
          currentViews + step * 2,
          currentViews + step * 3,
        ];
      }

      if (
        bounds.length !== 3 ||
        bounds[0] >= bounds[1] ||
        bounds[1] >= bounds[2]
      ) continue;

      const lockTime = env.now + HOUR;
      const resolveTime = env.now + DAY;

      drafts.push({
        templateKey: "YT_CREATOR_VIEWS",
        entity: channelId,
        windowKey: `creator24h:${Math.floor(env.now / 86400)}`,
        question:
          `How many total YouTube views will ` +
          `${channel.snippet.title} have in 24 hours?`,
        outcomes: [
          `Under ${compact(bounds[0])}`,
          `${compact(bounds[0])} – ${compact(bounds[1])}`,
          `${compact(bounds[1])} – ${compact(bounds[2])}`,
          `${compact(bounds[2])}+`,
        ],
        lockTime,
        resolveTime,
        meta: {
          channelId,
          bounds,
          baselineViews: currentViews,
          metric: "cumulative_channel_views",
        },
      });
    }

    return drafts;
  },

  async snapshot(meta, env) {
    if (!env.YOUTUBE_API_KEY) {
      throw new Error("Missing YOUTUBE_API_KEY");
    }

    const channelId = String(meta.channelId ?? "");

    if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) {
      throw new Error("Invalid YouTube channel ID");
    }

    const body = await youtube(
      `channels?part=statistics&id=${channelId}`,
      env.YOUTUBE_API_KEY
    );

    return {
      source: `${API}/channels?part=statistics&id=${channelId}`,
      fetchedAt: Math.floor(Date.now() / 1000),
      body,
    };
  },

  resolve: resolveYtCreatorViews,
};
