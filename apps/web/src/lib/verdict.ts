import type { ConfidenceBand, Evidence, RedirectStrength, Verdict } from "@rc/shared";

export interface VerdictStyle {
  /** What the user reads. Never a number -- a score invites argument. */
  label: string;
  /** One line saying what the verdict actually means. */
  gloss: string;
  accentClass: string;
  textClass: string;
}

/**
 * The four outcomes, written as routes rather than rulings.
 *
 * Every one of them ends somewhere you can go. That is the product's promise:
 * you leave knowing what to build, not just whether this particular version of
 * it survives. Even the hardest answer is "not this one -- here is what the
 * same evidence points at".
 */
export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  BUILD_IT: {
    label: "Build it",
    gloss: "People are unhappy with what exists, the market is not shrinking, and your angle is aimed at the right thing.",
    accentClass: "accent-build",
    textClass: "text-[var(--color-build)]",
  },
  BUILD_IT_DIFFERENTLY: {
    label: "Build it differently",
    gloss: "Right market, wrong angle. The opening is real, it is just not where you were looking.",
    accentClass: "accent-differently",
    textClass: "text-[var(--color-differently)]",
  },
  DONT_BUILD_IT: {
    label: "Not this one",
    gloss: "The idea as you described it does not work, and here is exactly why. Here is what the same evidence points at instead.",
    accentClass: "accent-dont",
    textClass: "text-[var(--color-dont)]",
  },
  GO_FIND_OUT: {
    label: "Go and check",
    gloss: "Not enough evidence to call it yet. Guessing would be worse than saying so, so here is what to go and find out.",
    accentClass: "accent-findout",
    textClass: "text-[var(--color-findout)]",
  },
};

/**
 * How much weight to put on an opening.
 *
 * The product always shows you somewhere to aim, which would be worthless if it
 * sounded equally certain every time. Grading the opening is what lets it stay
 * useful and honest at once -- a thin one is still worth knowing about, as long
 * as it is labelled thin.
 */
export const STRENGTH_LABEL: Record<RedirectStrength, { label: string; note: string }> = {
  strong: {
    label: "Well supported",
    note: "Several people raised this, across more than one product.",
  },
  thin: {
    label: "Worth checking first",
    note: "Real, but not yet widely felt. Verify before you bet on it.",
  },
  speculative: {
    label: "Our reading, not the market's",
    note: "Nobody said this outright. It is what the evidence suggests, and it may be wrong.",
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
