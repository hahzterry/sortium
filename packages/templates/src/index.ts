import { ytTop } from "./templates/ytTop";
import { ytViews } from "./templates/ytViews";
import { ytLikes } from "./templates/ytLikes";
import { ytEngagement } from "./templates/ytEngagement";
import { ytCreatorViews } from "./templates/ytCreatorViews";

import type { Template } from "./types";

export * from "./types";
export * from "./abi";

export const TEMPLATES: Record<string, Template> = {
  [ytTop.key]: ytTop,
  [ytViews.key]: ytViews,
  [ytLikes.key]: ytLikes,
  [ytEngagement.key]: ytEngagement,
  [ytCreatorViews.key]: ytCreatorViews,
};
