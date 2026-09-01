import type {
  BarrierEvidence,
  BarrierKind,
  CauseOfDeath,
  Competitor,
  ComplaintEvidence,
  CompetitorEvidence,
  ObituaryEvidence,
  PraiseEvidence,
  SourceId,
  TrendPointEvidence,
} from "@rc/shared";

/**
 * Builders for hand-written evidence.
 *
 * The eval harness cannot re-gather 2008 Reddit, so its historical cases were
 * always going to be written by hand. That makes these builders part of the
 * rubric's real tooling rather than test scaffolding -- they are what the
 * calibration cases in `src/evals` are made of.
 */

let counter = 0;
export function resetFixtureIds(): void {
  counter = 0;
}

interface Common {
  source?: SourceId;
  postedAt?: Date;
  url?: string;
  quote?: string;
}

function base(c: Common) {
  return {
    id: `e${++counter}`,
    source: c.source ?? ("hn" as SourceId),
    url: c.url ?? `https://example.com/${counter}`,
    quote: c.quote ?? "quoted text",
    postedAt: c.postedAt,
    retrievedAt: new Date("2026-01-01"),
  };
}

export function complaint(
  competitorId: string,
  opts: Common & { theme?: string } = {},
): ComplaintEvidence {
  return { ...base(opts), kind: "complaint", competitorId, theme: opts.theme };
}

export function praise(
  competitorId: string,
  opts: Common & { theme?: string } = {},
): PraiseEvidence {
  return { ...base(opts), kind: "praise", competitorId, theme: opts.theme };
}

export function competitorRow(
  competitorId: string,
  name: string,
  opts: Common = {},
): CompetitorEvidence {
  return { ...base(opts), kind: "competitor", competitorId, name };
}

export function obituary(
  name: string,
  causeOfDeath: CauseOfDeath,
  opts: Common & { diedAt?: Date } = {},
): ObituaryEvidence {
  return { ...base(opts), kind: "obituary", name, causeOfDeath, diedAt: opts.diedAt };
}

export function barrier(kind: BarrierKind, opts: Common = {}): BarrierEvidence {
  return { ...base(opts), kind: "barrier", barrier: kind };
}

export function trendPoint(
  series: string,
  at: Date,
  value: number,
  opts: Common = {},
): TrendPointEvidence {
  return { ...base(opts), kind: "trend_point", series, at, value };
}

export function competitor(id: string, name = id): Competitor {
  return { id, name };
}

/** Complaints and praise about one competitor, dated evenly across recent months. */
export function talk(
  competitorId: string,
  counts: { complaints?: number; praise?: number; theme?: string; source?: SourceId },
  now = new Date("2026-01-01"),
): (ComplaintEvidence | PraiseEvidence)[] {
  const out: (ComplaintEvidence | PraiseEvidence)[] = [];
  const recent = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60);
  for (let i = 0; i < (counts.complaints ?? 0); i++) {
    out.push(
      complaint(competitorId, { theme: counts.theme, postedAt: recent, source: counts.source }),
    );
  }
  for (let i = 0; i < (counts.praise ?? 0); i++) {
    out.push(praise(competitorId, { postedAt: recent, source: counts.source }));
  }
  return out;
}
