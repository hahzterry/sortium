import type { Snapshot } from "../types";
import { VOID } from "../types";

export function resolveYtCreatorViews(
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
    items?: { statistics?: { viewCount?: string } }[];
  } | null;

  const raw = body?.items?.[0]?.statistics?.viewCount;
  if (raw === undefined || !/^\d+$/.test(raw)) return VOID;

  const views = Number(raw);
  if (!Number.isSafeInteger(views)) return VOID;

  const index = bounds.findIndex((bound) => views < bound);
  return index === -1 ? 3 : index;
}
