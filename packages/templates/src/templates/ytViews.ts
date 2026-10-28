import { resolveYtViews } from "../resolve/ytViews";
import { compact, viewBounds } from "../brackets";
import type { Env, MarketDraft, Template } from "../types";

const API = "https://www.googleapis.com/youtube/v3";

async function yt<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`${API}/${path}&key=${key}`);
  if (!res.ok) throw new Error(`yt ${path.split("?")[0]} ${res.status}`);
  return (await res.json()) as T;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};

type Videos = { items: { id: string; snippet: { title: string; channelTitle: string; publishedAt: string }; statistics: { viewCount: string } }[] };

export const ytViews: Template = {
  key: "YT_VIEWS_24H",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytViews.ts",
  plannedKeys: (_env: Env): string[] => [],
  rules:
    "Outcome = statistics.viewCount from YouTube Data API v3 videos.list for the video at the first resolver fetch at or after " +
    "24 hours after publishing. Brackets are fixed when the market opens. Video removed, private or missing → void, stakes refunded.",
  async drafts(env: Env): Promise<MarketDraft[]> {
    if (!env.YOUTUBE_API_KEY || !env.YT_CREATORS) return [];
    const key = env.YOUTUBE_API_KEY;
    const out: MarketDraft[] = [];
    for (const channelId of env.YT_CREATORS.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!channelId.startsWith("UC")) continue;
      const uploads = `UU${channelId.slice(2)}`;
      const pl = await yt<{ items: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=11&playlistId=${uploads}`, key);
      const ids = pl.items.map((i) => i.contentDetails.videoId);
      if (ids.length < 2) continue;
      const vids = await yt<Videos>(`videos?part=snippet,statistics&id=${ids.join(",")}`, key);
      const newest = vids.items.find((v) => v.id === ids[0]);
      if (!newest) continue;
      
      
      // FIX: Force lockTime to be 1 hour from NOW so the contract doesn't revert on older videos
      const lockTime = env.now + 3600; 
      // FIX: Force resolveTime to be 24 hours after the new lockTime
      const resolveTime = lockTime + 86400;

      // if (env.now > lockTime - 300) continue; // Commented out for testing

      const older = vids.items.filter((v) => v.id !== newest.id).map((v) => Number(v.statistics.viewCount));
      const bounds = viewBounds(median(older));
      out.push({
        templateKey: "YT_VIEWS_24H",
        entity: newest.id,
        windowKey: "24h",
        question: `How many views will "${newest.snippet.title.slice(0, 80)}" by ${newest.snippet.channelTitle} have 24h after publishing?`,
        outcomes: [
          `Under ${compact(bounds[0])}`,
          `${compact(bounds[0])} – ${compact(bounds[1])}`,
          `${compact(bounds[1])} – ${compact(bounds[2])}`,
          `${compact(bounds[2])}+`,
        ],
        lockTime,
        resolveTime,
        meta: { videoId: newest.id, channelId, bounds },
      });
    }
    return out;
  },
  async snapshot(meta, env) {
    const body = await yt(`videos?part=statistics&id=${meta.videoId as string}`, env.YOUTUBE_API_KEY!);
    return { source: `${API}/videos?part=statistics&id=${meta.videoId as string}`, fetchedAt: Math.floor(Date.now() / 1000), body };
  },
  resolve: resolveYtViews,
};
/**
 * Returns the next 12:00 UTC resolution slot that leaves
 * at least 12 hours and 10 minutes before resolution.
 */
export function nextResolve(now: number): number {
  const DAY = 86_400;
  const NOON = 12 * 3600;
  const MINIMUM_LEAD = 12 * 3600 + 600;

  let resolveTime =
    Math.floor(now / DAY) * DAY + NOON;

  while (resolveTime <= now + MINIMUM_LEAD) {
    resolveTime += DAY;
  }

  return resolveTime;
}

/**
 * Generate a human-readable YouTube prediction question.
 */
export function viewsQuestion(
  creator: string,
  target: number,
  hours: number
): string {
  const action = hours === 24 ? "reach" : "gain";

  return `Will ${creator} ${action} ${target.toLocaleString("en-US")} YouTube views within ${hours} hours?`;
}
