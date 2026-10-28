import type { Env, MarketDraft, Template } from "../types";

export const ytLikes: Template = {
  key: "YT_LIKES_24H",
  version: 1,
  demo: false,
  resolveFile: "resolve/ytLikes.ts",
  plannedKeys: (env: Env) => [],
  rules: "Predict the number of likes on a new video after 24 hours.",
  async drafts(env: Env): Promise<MarketDraft[]> {
    return [];
  },
  // Added (meta, env) to match the expected signature
      async snapshot(meta: Record<string, unknown>, env: Env): Promise<any> {
    return {}; 
  },
  // Return 0 (index of "Other" or the default outcome) instead of a string
  resolve: () => 0, 
};