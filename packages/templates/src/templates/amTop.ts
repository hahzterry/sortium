
import { VOID } from "../types";
import type { Env, MarketDraft, Snapshot, Template } from "../types";

const MARKETS = ["YT_VIEWS_24H", "YT_VIEW_VELOCITY", "YT_LIKES_24H", "YT_ENGAGEMENT_RATE", "YT_CREATOR_VIEWS"] as const;
const DAY = 86_400;
export const feedUrl = (id: string, n: number) => `https://www.googleapis.com/youtube/v3/${n === 0 ? "channels" : "videos"}?part=snippet,statistics&id=${encodeURIComponent(id)}`;

type Feed = { items: { id: string; snippet?: { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { high?: { url: string } } }; statistics?: { viewCount?: string; likeCount?: string } }[] };

/** YouTube's API intermittently answers 5xx; retry a few times before giving up. */
export async function fetchFeed(id: string, apiKey: string, n = 10): Promise<Feed> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${feedUrl(id, n)}&key=${encodeURIComponent(apiKey)}`, { headers: { "user-agent": "cwf-markets" }, signal: AbortSignal.timeout(6000) });
      if (res.ok) return (await res.json()) as Feed;
      last = `youtube feed ${id} ${res.status}`;
    } catch (e) {
      last = `youtube feed ${id} ${String(e)}`;
    }
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new Error(last);
}

/** Next 12:00 UTC whose 12h lock is still at least 10 minutes away. */
export function nextResolve(now: number): number {
  let t = Math.floor(now / DAY) * DAY + 12 * 3600;
  while (t - 12 * 3600 <= now + 600) t += DAY;
  return t;
}

const MARKET: Record<string, string> = {
  YT_VIEWS_24H: "1,000,000 views within 24 hours",
  YT_VIEW_VELOCITY: "250,000 additional views within 6 hours",
  YT_LIKES_24H: "50,000 likes within 24 hours",
  YT_ENGAGEMENT_RATE: "a likes-to-views ratio above 5%",
  YT_CREATOR_VIEWS: "the most new views among tracked creators",
};
export const marketName = (key: string) => MARKET[key] ?? key;

/** YouTube KPI market questions use the specified video or creator and resolution time. */
export function chartQuestion(item: string, chart: string, channel: string, resolveTime: number, demo: boolean): string {
  const d = new Date(resolveTime * 1000);
  const hhmm = d.toISOString().slice(11, 16);
  const when = demo ? `at ${hhmm} UTC` : `on ${d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} (${hhmm} UTC)`;
  return `${demo ? "[demo] " : ""}Will ${channel}'s ${item} achieve ${marketName(chart)} by ${when}?`;
}

function make(key: string, demo: boolean, channels: readonly string[]): Template {
  const windowKey = (now: number) =>
    demo ? String(Math.floor(now / 900)) : new Date(nextResolve(now) * 1000).toISOString().slice(0, 10);
  return {
    plannedKeys: (env: Env) => channels.map((channel) => `${key}:${channel}:${windowKey(env.now)}`),
    key,
    version: 1,
    demo,
    resolveFile: "resolve/ytMarkets.ts",
    rules:
      "Outcomes are determined from official YouTube Data API v3 statistics and timestamped observations. " +
      "YT_VIEWS_24H: YES if the video reaches at least 1,000,000 views within 24 hours of publication. " +
      "YT_VIEW_VELOCITY: YES if views increase by at least 250,000 across the defined six-hour measurement window. " +
      "YT_LIKES_24H: YES if the video reaches at least 50,000 likes within 24 hours of publication. " +
      "YT_ENGAGEMENT_RATE: YES if likes divided by views is strictly greater than 0.05 at resolution. " +
      "YT_CREATOR_VIEWS: the creator with the largest view-count increase during the defined period wins. " +
      "If required statistics are unavailable or cannot be verified, the market is void and stakes are refunded.",
    async drafts(env: Env): Promise<MarketDraft[]> {
      const out: MarketDraft[] = [];
      if (!env.YOUTUBE_API_KEY) return out;
      for (const channel of channels) {
        const resolveTime = demo ? env.now + 1140 : nextResolve(env.now);
        const lockTime = demo ? env.now + 840 : resolveTime - 12 * 3600;
        const ids = (env.YT_CREATORS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
        if (!ids.length) continue;
        let feed: Feed;
        try {
          feed = await fetchFeed(ids.join(","), env.YOUTUBE_API_KEY, key === "YT_CREATOR_VIEWS" ? 0 : 10);
        } catch (e) {
          console.error(String(e));
          continue;
        }
        const candidates = feed.items
          .slice(0, 7)
          .map((r) => ({ id: r.id, label: r.snippet?.title ?? r.snippet?.channelTitle ?? r.id, art: r.snippet?.thumbnails?.high?.url }));
        if (!candidates.length) continue;
        const video = candidates[0];
        const publishedAt = feed.items[0]?.snippet?.publishedAt;
        if (key !== "YT_CREATOR_VIEWS" && !publishedAt) continue;
        const startTime = key === "YT_VIEW_VELOCITY" ? resolveTime - 6 * 3600 : resolveTime - DAY;
        out.push({
          templateKey: key,
          entity: key === "YT_CREATOR_VIEWS" ? channel : video.id,
          windowKey: windowKey(env.now),
          question: chartQuestion(key === "YT_CREATOR_VIEWS" ? "tracked creators" : `"${video.label}"`, key, channel, resolveTime, demo),
          outcomes: key === "YT_CREATOR_VIEWS" ? [...candidates.map((c) => c.label), "Other"] : ["Yes", "No"],
          lockTime,
          resolveTime,
          meta: { channel, videoId: video.id, candidates, publishedAt, startTime, resolveTime, templateKey: key },
        });
      }
      return out;
    },
    async snapshot(meta, env: Env): Promise<Snapshot> {
      if (!env.YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is required");
      const id = meta.templateKey === "YT_CREATOR_VIEWS"
        ? (meta.candidates as { id: string }[]).map((c) => c.id).join(",")
        : meta.videoId as string;
      const n = meta.templateKey === "YT_CREATOR_VIEWS" ? 0 : 10;
      const body = await fetchFeed(id, env.YOUTUBE_API_KEY, n);
      return { source: feedUrl(id, n), fetchedAt: Math.floor(Date.now() / 1000), body };
    },
    resolve(meta: Record<string, unknown>, snap: Snapshot): number {
      const body = snap.body as Feed;
      const items = body.items ?? [];
      const key = meta.templateKey as string;
      if (!items.length) return VOID;

      if (key === "YT_CREATOR_VIEWS") {
        const candidates = meta.candidates as { id: string }[];
        const baseline = meta.baseline as Record<string, number> | undefined;
        if (!baseline || items.length !== candidates.length) return VOID;
        const gains = candidates.map((c) => {
          const item = items.find((v) => v.id === c.id);
          const current = Number(item?.statistics?.viewCount);
          const previous = baseline[c.id];
          return item && Number.isFinite(current) && Number.isFinite(previous) && current >= previous ? current - previous : NaN;
        });
        if (gains.some((v) => !Number.isFinite(v))) return VOID;
        const highest = Math.max(...gains);
        return gains.indexOf(highest);
      }

      const video = items.find((v) => v.id === meta.videoId);
      if (!video) return VOID;
      const views = Number(video.statistics?.viewCount);
      const likes = Number(video.statistics?.likeCount);

      if (key === "YT_VIEWS_24H") return Number.isFinite(views) ? (views >= 1_000_000 ? 0 : 1) : VOID;
      if (key === "YT_LIKES_24H") return video.statistics?.likeCount !== undefined && Number.isFinite(likes) ? (likes >= 50_000 ? 0 : 1) : VOID;
      if (key === "YT_ENGAGEMENT_RATE") return video.statistics?.likeCount !== undefined && Number.isFinite(likes) && Number.isFinite(views) && views > 0 ? (likes / views > 0.05 ? 0 : 1) : VOID;
      if (key === "YT_VIEW_VELOCITY") {
        const baseline = Number(meta.baselineViews);
        if (!Number.isFinite(baseline) || !Number.isFinite(views) || views < baseline) return VOID;
        return views - baseline >= 250_000 ? 0 : 1;
      }
      return VOID;
    },
  };
}

export const ytViews24h = make("YT_VIEWS_24H", false, ["@warehousejobz"]);
export const ytViewVelocity = make("YT_VIEW_VELOCITY", false, ["@warehousejobz"]);
export const ytLikes24h = make("YT_LIKES_24H", false, ["@warehousejobz"]);
export const ytEngagementRate = make("YT_ENGAGEMENT_RATE", false, ["@warehousejobz"]);
export const ytCreatorViews = make("YT_CREATOR_VIEWS", false, ["@warehousejobz"]);
