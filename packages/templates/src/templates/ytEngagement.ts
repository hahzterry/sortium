
import { resolveYtEngagement } from "../resolve/ytEngagement";
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
    viewCount?: string;
    likeCount?: string;
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

export const ytEngagement: Template = {
  key: "YT_ENGAGEMENT_RATE",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytEngagement.ts",

  rules:
    "Resolve using YouTube Data API statistics.likeCount divided by " +
    "statistics.viewCount multiplied by 100 at the scheduled resolution " +
    "time. Compare the resulting percentage against the four fixed " +
    "market brackets. Missing statistics, a deleted or private video, " +
    "or zero views results in a void market.",

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

      const rates = (videos.items ?? [])
        .filter((video) => video.id !== newest.id)
        .map((video) => {
          const views = Number(video.statistics?.viewCount);
          const likes = Number(video.statistics?.likeCount);

          if (
            !Number.isSafeInteger(views) ||
            !Number.isSafeInteger(likes) ||
            views <= 0 ||
            likes < 0
          ) return null;

          return (likes / views) * 100;
        })
        .filter((value): value is number =>
          value !== null && Number.isFinite(value)
        )
        .sort((a, b) => a - b);

      if (rates.length === 0) continue;

      const median = rates[Math.floor(rates.length / 2)];

      // Percentage-point boundaries, not fractions.
      const bounds = [
        Math.max(0.1, Number((median * 0.5).toFixed(2))),
        Math.max(0.2, Number(median.toFixed(2))),
        Math.max(0.3, Number((median * 1.5).toFixed(2))),
      ];

      if (
        bounds[0] >= bounds[1] ||
        bounds[1] >= bounds[2]
      ) {
        // Avoid invalid overlapping brackets.
        bounds[0] = 1;
        bounds[1] = 3;
        bounds[2] = 5;
      }

      const lockTime = env.now + HOUR;
      const resolveTime = env.now + DAY;

      drafts.push({
        templateKey: "YT_ENGAGEMENT_RATE",
        entity: newest.id,
        windowKey: "engagement24h",
        question:
          `What will the like-to-view engagement rate of ` +
          `"${newest.snippet.title.slice(0, 80)}" ` +
          `by ${newest.snippet.channelTitle} be in 24 hours?`,
        outcomes: [
          `Under ${bounds[0]}%`,
          `${bounds[0]}% – ${bounds[1]}%`,
          `${bounds[1]}% – ${bounds[2]}%`,
          `${bounds[2]}%+`,
        ],
        lockTime,
        resolveTime,
        meta: {
          videoId: newest.id,
          channelId,
          bounds,
          metric: "likes_per_view_percentage",
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

  resolve: resolveYtEngagement,
};
