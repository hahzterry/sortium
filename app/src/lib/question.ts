import { decidedAt, trClock } from "./i18n";

type Q = { templateKey: string; question: string; resolveTime: number; demo: boolean; meta: Record<string, unknown> };

/**
 * The question as people should read it.
 * Chart markets (like YouTube View Velocity) are rebuilt from their data.
 * The demo flag is shown as a badge, not as a "[demo]" prefix.
 */
export function displayQuestion(m: Q, opts: { short?: boolean } = {}): string {
  // Handle the YouTube Top View Velocity market specifically
  if (m.templateKey === "YT_TOP_VIEW_VELOCITY" && typeof m.meta.region === "string") {
    const region = (m.meta.region as string).toUpperCase();
    
    if (opts.short) {
      return `Which video will top YouTube in ${region}?`;
    }
    
    const when = m.demo 
      ? `at ${trClock(new Date(m.resolveTime * 1000).toISOString().slice(11, 16))}`
      : decidedAt(m.resolveTime, "en");
      
    return `Which video will top YouTube in ${region} ${when}?`;
  }

  // Default fallback: just use the question from the backend, stripping any [demo] tag
  return m.question.replace(/^\[demo\] /, "");
}

/** Outcome labels the templates write in English ("Under 1.2M", "Other") in the reader's language. */
export function displayOutcome(label: string, _lang?: string): string {
  return label;
}