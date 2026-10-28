
import { resolveYtLikes } from "../resolve/ytLikes";
import { compact, viewBounds } from "../brackets";
import type { Env, MarketDraft, Template } from "../types";

const API = "https://www.googleapis.com/youtube/v3";
const HOUR = 3600;
const DAY = 86400;

type Video = {
  id: string;
  snippet?: {
    title: string;
    channelTitle: string;
    publishedAt: string;
  };
  statistics?: {
    likeCount?: string;
    viewCount?: string;
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

export const ytLikes: Template = {
  key: "YT_LIKES_24H",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytLikes.ts",

  rules:
    "Resolve using the YouTube Data API videos.list statistics.likeCount " +
    "at the first resolver fetch at or after the scheduled resolution time. " +
    "Compare the observed like count against the four fixed market brackets. " +
    "If the video or required statistics are unavailable, void the market " +
    "and refund stakes.",

  plannedKeys: (_env: Env): string[] => [],

  async drafts(env: Env): Promise<MarketDraft[]> {
    if (!env.YOUTUBE_API_KEY || !env.YT_CREATORS) return [];

    const drafts: MarketDraft[] = [];

    const channels = env.YT_CREATORS
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.startsWith("UC"));

    for (const channelId of channels) {
      const playlistId = `UU${channelId.slice(2)}`;

      const playlist = await youtube<{
        items?: {
          contentDetails: { videoId: string };
        }[];
      }>(
        `playlistItems?part=contentDetails&maxResults=11&playlistId=${playlistId}`,
        env.YOUTUBE_API_KEY
      );

      const ids = (playlist.items ?? [])
        .map((item) => item.contentDetails.videoId)
        .filter(Boolean);

      if (ids.length < 2) continue;

      const videos = await youtube<{ items?: Video[] }>(
        `videos?part=snippet,statistics&id=${ids.join(",")}`,
        env.YOUTUBE_API_KEY
      );

      const newest = videos.items?.find(
        (video) => video.id === ids[0]
      );

      if (!newest?.snippet) continue;

      const historicalLikes = (videos.items ?? [])
        .filter((video) => video.id !== newest.id)
        .map((video) => Number(video.statistics?.likeCount))
        .filter((value) => Number.isSafeInteger(value) && value >= 0)
        .sort((a, b) => a - b);

      if (historicalLikes.length === 0) continue;

      const median = historicalLikes[
        Math.floor(historicalLikes.length / 2)
      ];

      const bounds = viewBounds(Math.max(1, median));

      if (
        bounds.length !== 3 ||
        bounds.some((value) => !Number.isFinite(value)) ||
        bounds[0] >= bounds[1] ||
        bounds[1] >= bounds[2]
      ) continue;

      const lockTime = env.now + HOUR;
      const resolveTime = env.now + DAY;

      drafts.push({
        templateKey: "YT_LIKES_24H",
        entity: newest.id,
        windowKey: "likes24h",
        question:
          `How many likes will "${newest.snippet.title.slice(0, 80)}" ` +
          `by ${newest.snippet.channelTitle} have in 24 hours?`,
        outcomes: [
          `Under ${compact(bounds[0])}`,
          `${compact(bounds[0])} – ${compact(bounds[1])}`,
          `${compact(bounds[1])} – ${compact(bounds[2])}`,
          `${compact(bounds[2])}+`,
        ],
        lockTime,
        resolveTime,
        meta: {
          videoId: newest.id,
          channelId,
          bounds,
        },
      });
    }

    return drafts;
  },

  async snapshot(meta, env) {
    if (!env.YOUTUBE_API_KEY) {
      throw new Error("Missing YOUTUBE_API_KEY");
    }

    const videoId = String(meta.videoId ?? "");

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      throw new Error("Invalid YouTube video ID");
    }

    const body = await youtube(
      `videos?part=statistics&id=${videoId}`,
      env.YOUTUBE_API_KEY
    );

    return {
      source: `${API}/videos?part=statistics&id=${videoId}`,
      fetchedAt: Math.floor(Date.now() / 1000),
      body,
    };
  },

  resolve: resolveYtLikes,
};
