import type { Snapshot } from "../types";
import { VOID } from "../types";

export function resolveYtLikes(
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
    items?: { statistics?: { likeCount?: string } }[];
  } | null;

  const raw = body?.items?.[0]?.statistics?.likeCount;
  if (raw === undefined || !/^\d+$/.test(raw)) return VOID;

  const likes = Number(raw);
  if (!Number.isSafeInteger(likes)) return VOID;

  return bounds.findIndex((bound) => likes < bound) === -1
    ? 3
    : bounds.findIndex((bound) => likes < bound);
}
