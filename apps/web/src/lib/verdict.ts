import type { ConfidenceBand, Evidence, Verdict } from "@rc/shared";

export interface VerdictStyle {
  /** What the user reads. Never a number -- a score invites argument. */
  label: string;
  /** One line saying what the verdict actually means. */
  gloss: string;
  accentClass: string;
  textClass: string;
}

export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  BUILD_IT: {
    label: "Build it",
    gloss: "There is a real gap here, people are asking for it, and you can get in.",
    accentClass: "accent-build",
    textClass: "text-[var(--color-build)]",
  },
  BUILD_IT_DIFFERENTLY: {
    label: "Build it differently",
    gloss: "Right market, wrong angle. The opening is not where you think it is.",
    accentClass: "accent-differently",
    textClass: "text-[var(--color-differently)]",
  },
  DONT_BUILD_IT: {
    label: "Don't build it",
    gloss: "The evidence says no. Here is exactly what it says, and where to go instead.",
    accentClass: "accent-dont",
    textClass: "text-[var(--color-dont)]",
  },
  GO_FIND_OUT: {
    label: "Go find out",
    gloss: "Not enough evidence to call it. Guessing would be worse than saying so.",
    accentClass: "accent-findout",
    textClass: "text-[var(--color-findout)]",
  },
};

export const CONFIDENCE_GLOSS: Record<ConfidenceBand, string> = {
  high: "Most sources returned, and they agree with each other.",
  medium: "Enough to act on, but some sources dropped out of this run.",
  low: "Thin coverage. Treat this as a direction, not an answer.",
};

/** Which of the seven rules decided this, in words rather than a number. */
export const RULE_NAME: Record<number, string> = {
  1: "Not enough evidence",
  2: "Empty market",
  3: "The graveyard",
  4: "Users are content",
  5: "Barriers to entry",
  6: "The opening",
  7: "Mixed evidence",
};

export type ProseSegment =
  | { kind: "text"; text: string }
  | { kind: "citation"; evidenceId: string; index: number };

/**
 * Splits verdict prose into text and citation markers.
 *
 * Uncited sentences are dropped upstream, before anything reaches this
 * function -- silently, so the user never sees a claim without a source rather
 * than seeing one flagged as unsupported. What arrives here is already clean;
 * this only turns `[ev_004]` into something clickable.
 */
export function parseProse(prose: string, citable: Set<string>): ProseSegment[] {
  const segments: ProseSegment[] = [];
  const pattern = /\[([a-z]{2,4}_\d{3})\]/g;
  const order = new Map<string, number>();
  let last = 0;

  for (let m = pattern.exec(prose); m !== null; m = pattern.exec(prose)) {
    const evidenceId = m[1] as string;
    if (!citable.has(evidenceId)) continue;

    if (m.index > last) segments.push({ kind: "text", text: prose.slice(last, m.index) });
    if (!order.has(evidenceId)) order.set(evidenceId, order.size + 1);
    segments.push({ kind: "citation", evidenceId, index: order.get(evidenceId) as number });
    last = m.index + m[0].length;
  }

  if (last < prose.length) segments.push({ kind: "text", text: prose.slice(last) });
  return segments;
}

export function evidenceById(evidence: Evidence[]): Map<string, Evidence> {
  return new Map(evidence.map((e) => [e.id, e]));
}

export const SOURCE_LABEL: Record<string, string> = {
  hn: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  search: "Web",
  appstore: "App Store",
  packages: "Packages",
  trends: "Trends",
};

export function formatDate(d: Date | undefined): string {
  if (!d) return "undated";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
