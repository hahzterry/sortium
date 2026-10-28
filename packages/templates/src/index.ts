// packages/templates/src/index.ts

// 1. Import your new files
import { ytTop } from "./templates/ytTop";
import { ytViews } from "./templates/ytViews";
import { ytLikes } from "./templates/ytLikes";

import type { Template } from "./types";

export * from "./types";
export * from "./abi";

// 2. Add them to the TEMPLATES object
export const TEMPLATES: Record<string, Template> = {
  [ytTop.key]: ytTop,
  [ytViews.key]: ytViews,
  [ytLikes.key]: ytLikes,
};