
import { TEMPLATES } from "@cwf/templates";
import type { Row } from "./logic";
import { appleIdsByCountry, lookupApple, withArt } from "./art";
import { poolSummaries } from "./activity";

const toApi = (r: Row) => ({
  id: r.market_id,
  templateKey: r.template_key,
  entity: r.entity,
  question: r.question,
  outcomes: JSON.parse(r.outcomes) as string[],
  lockTime: r.lock_time,
  resolveTime: r.resolve_time,
  status: r.status,
  demo: !!r.demo,
  meta: JSON.parse(r.meta) as Record<string, unknown>,
  assertionId: r.assertion_id ?? undefined,
  rules: TEMPLATES[r.template_key]?.rules,
});

export async function listMarkets(db: D1Database, url: URL) {
  const status = url.searchParams.get("status") ?? "all";
  const now = Math.floor(Date.now() / 1000);
  const q =
    status === "open"
      ? db.prepare("SELECT * FROM markets WHERE status = 'open' AND lock_time > ? ORDER BY lock_time ASC LIMIT 200").bind(now)
      : status === "all"
        ? db.prepare("SELECT * FROM markets WHERE market_id IS NOT NULL ORDER BY market_id DESC LIMIT 200")
        : db.prepare("SELECT * FROM markets WHERE status = ? ORDER BY market_id DESC LIMIT 200").bind(status);
  const { results } = await q.all<Row>();
  const [art, pools] = await Promise.all([lookupApple(appleIdsByCountry(results.map(toApi)), db), poolSummaries(db).catch(() => new Map())]);
  const markets = results.map((r) => ({ ...toApi(r), pool: pools.get(r.market_id ?? -1) ?? { byOutcome: {}, total: "0", bettors: 0 } }));
  return Response.json({ markets: withArt(markets, art) });
}

async function cachedJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cf: { cacheTtlByStatus: { "200-299": 60, "300-599": 0 }, cacheEverything: true } } as RequestInit);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function getMarket(db: D1Database, id: number, youtubeKey?: string) {
  const r = await db.prepare("SELECT * FROM markets WHERE market_id = ?").bind(id).first<Row>();
  if (!r) return Response.json({ error: "not found" }, { status: 404 });
  const m = toApi(r);
  let live: { label: string; value: string } | undefined;
  try {
    if (["YT_VIEWS_24H", "YT_VIEW_VELOCITY", "YT_LIKES_24H", "YT_ENGAGEMENT_RATE"].includes(r.template_key) && youtubeKey) {
      const videoId = String(m.meta.videoId ?? "");
      if (videoId) {
        const v = (await cachedJson(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(youtubeKey)}`)) as {
          items?: { statistics?: { viewCount?: string; likeCount?: string } }[];
        };
        const stats = v.items?.[0]?.statistics;
        if (stats) {
          const views = Number(stats.viewCount ?? 0);
          const likes = Number(stats.likeCount ?? 0);
          if (r.template_key === "YT_VIEWS_24H") {
            live = { label: "Views now", value: views.toLocaleString("en-US") };
          } else if (r.template_key === "YT_VIEW_VELOCITY") {
            live = { label: "Total views now", value: views.toLocaleString("en-US") };
          } else if (r.template_key === "YT_LIKES_24H") {
            live = { label: "Likes now", value: likes.toLocaleString("en-US") };
          } else if (r.template_key === "YT_ENGAGEMENT_RATE") {
            live = { label: "Like-to-view rate", value: views > 0 ? `${((likes / views) * 100).toFixed(2)}%` : "N/A" };
          }
        }
      }
    } else if (r.template_key === "YT_CREATOR_VIEWS" && youtubeKey) {
      const channelId = String(m.meta.channelId ?? "");
      if (channelId) {
        const c = (await cachedJson(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(youtubeKey)}`,
        )) as { items?: { statistics?: { viewCount?: string } }[] };
        live = { label: "Creator total views now", value: c.items?.[0]?.statistics?.viewCount ? Number(c.items[0].statistics.viewCount).toLocaleString("en-US") : "—" };
      }
    }
  } catch {
    // live data is best-effort; the market page still works without it
  }
  const [illustrated] = withArt([m], await lookupApple(appleIdsByCountry([m]), db));
  return Response.json({ ...illustrated, live });
}

export async function getEvidence(db: D1Database, id: number) {
  const s = await db.prepare("SELECT body FROM snapshots WHERE market_id = ?").bind(id).first<{ body: string }>();
  if (!s) return new Response("no evidence yet", { status: 404 });
  return new Response(s.body, { headers: { "content-type": "application/json" } });
}
