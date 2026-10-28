import type { Snapshot } from "../types";
import { VOID } from "../types";

export function resolveYtEngagement(
  meta: Record<string, unknown>,
  snap: Snapshot
): number {
  const bounds = meta.bounds;

  if (
    !Array.isArray(bounds) ||
    bounds.length !== 3 ||
    !bounds.every((v) => typeof v === "number" && Number.isFinite(v)) ||
    bounds[0] >= bounds[1] ||
    bounds[1] >= bounds[2]
  ) return VOID;

  const body = snap.body as {
    items?: {
      statistics?: { viewCount?: string; likeCount?: string };
    }[];
  } | null;

  const stats = body?.items?.[0]?.statistics;
  if (
    !stats?.viewCount ||
    stats.likeCount === undefined ||
    !/^\d+$/.test(stats.viewCount) ||
    !/^\d+$/.test(stats.likeCount)
  ) return VOID;

  const views = Number(stats.viewCount);
  const likes = Number(stats.likeCount);

  if (
    !Number.isSafeInteger(views) ||
    !Number.isSafeInteger(likes) ||
    views <= 0
  ) return VOID;

  const rate = (likes / views) * 100;
  const index = bounds.findIndex((bound) => rate < bound);
  return index === -1 ? 3 : index;
}
