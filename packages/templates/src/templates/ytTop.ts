
import type { Env, MarketDraft, Template } from "../types";

const CHANNEL_HANDLE = "warehousejobz";
const MARKET_KEY = "YT_VIEW_VELOCITY";
const VIEW_TARGET = 250_000;
const WINDOW_SECONDS = 6 * 3600;
const LOCK_SECONDS = 3600;

const channelUrl = (key: string) =>
  `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${CHANNEL_HANDLE}&key=${key}`;

const chartUrl = (videoId: string, key: string, n: number) =>
  `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}&maxResults=${n}&key=${key}`;

type Chart = { items: { id: string; snippet: { title: string; channelTitle: string; publishedAt: string }; statistics: { viewCount?: string; likeCount?: string } }[] };

async function fetchChart(videoId: string, key: string, n: number): Promise<Chart> {
  const res = await fetch(chartUrl(videoId, key, n));
  if (!res.ok) throw new Error(`yt video ${videoId} ${res.status}`);
  return (await res.json()) as Chart;
}

// --- Warehouse Jobz YouTube upload discovery ---

async function fetchUploads(key: string): Promise<Chart> {
  const channelRes = await fetch(channelUrl(key));
  if (!channelRes.ok) throw new Error(`yt channel ${channelRes.status}`);
  const channel = (await channelRes.json()) as {
    items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
  };
  const playlistId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error(`YouTube channel not found: @${CHANNEL_HANDLE}`);

  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${key}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) throw new Error(`yt uploads ${playlistRes.status}`);
  const playlist = (await playlistRes.json()) as {
    items?: { contentDetails?: { videoId?: string } }[];
  };
  const ids = (playlist.items ?? []).map((v) => v.contentDetails?.videoId).filter((id): id is string => !!id);
  if (!ids.length) return { items: [] };

  return fetchChart(ids.join(","), key, 50);
}

function nextResolve(published: number): number {
  return published + WINDOW_SECONDS;
}

function chartQuestion(item: string, name: string, _region: string, _resolveTime: number, _demo: boolean): string {
  return `Will ${name} gain at least ${VIEW_TARGET.toLocaleString("en-US")} views within six hours of publication for "${item}"?`;
}

// -----------------------------------------------------------

export const ytTop: Template = {
  key: MARKET_KEY,
  version: 1,
  demo: false,
  resolveFile: "resolve/ytTop.ts",
  plannedKeys: (_env: Env) => [],
  rules:
    "YES if the Warehouse Jobz video gains at least 250,000 views during the six-hour window beginning at publication. " +
    "NO if the increase is below 250,000 views. The starting view count and final view count must be verifiable. Missing data results in a void market.",
  async drafts(env: Env): Promise<MarketDraft[]> {
    if (!env.YOUTUBE_API_KEY) return [];
    const out: MarketDraft[] = [];
    let chart: Chart;
    try {
      chart = await fetchUploads(env.YOUTUBE_API_KEY);
    } catch (e) {
      console.error(String(e));
      return [];
    }
    for (const video of chart.items) {
      const published = Math.floor(new Date(video.snippet.publishedAt).getTime() / 1000);
      if (!Number.isFinite(published)) continue;
      const resolveTime = nextResolve(published);
      const lockTime = published + LOCK_SECONDS;
      if (env.now >= lockTime - 300 || env.now < published) continue;
      out.push({
        templateKey: MARKET_KEY,
        entity: video.id,
        windowKey: `${video.id}:${published}`,
        question: chartQuestion(video.snippet.title, "Warehouse Jobz", CHANNEL_HANDLE, resolveTime, false),
        outcomes: ["Yes", "No"],
        lockTime,
        resolveTime,
        meta: {
          videoId: video.id,
          channelHandle: CHANNEL_HANDLE,
          channelTitle: video.snippet.channelTitle,
          title: video.snippet.title,
          publishedAt: video.snippet.publishedAt,
          measurementStart: published,
          measurementEnd: resolveTime,
          viewTarget: VIEW_TARGET,
          baselineViews: null,
        },
      });
    }
    return out;
  },
  async snapshot(meta, env) {
    if (!env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");
    const videoId = String(meta.videoId ?? "");
    if (!videoId) throw new Error("Missing videoId");
    const body = await fetchChart(videoId, env.YOUTUBE_API_KEY, 1);
    return { source: chartUrl(videoId, "REDACTED", 1), fetchedAt: Math.floor(Date.now() / 1000), body };
  },
  resolve(meta, snap) {
    const baseline = Number(meta.baselineViews);
    const videoId = String(meta.videoId ?? "");
    const body = snap.body as Chart;
    const current = body.items?.find((v) => v.id === videoId);
    const finalViews = Number(current?.statistics?.viewCount);

    if (meta.baselineViews === null || meta.baselineViews === undefined) return 255;
    if (!Number.isFinite(baseline) || !Number.isFinite(finalViews)) return 255;
    if (!current) return 255;

    return finalViews - baseline >= VIEW_TARGET ? 0 : 1;
  },
};
