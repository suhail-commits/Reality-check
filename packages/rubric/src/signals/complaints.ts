import type { Evidence } from "@rc/shared";
import { RECURRENCE_BONUS, RECURRENCE_MIN_COMPETITORS } from "../constants.js";
import { byKind, recencyWeight, sourceWeight } from "../weights.js";

export interface ComplaintSignal {
  /** Evidence-weighted mean of complaints / (complaints + praise) per competitor. */
  ratio: number;
  complaintVolume: number;
  praiseVolume: number;
  /** Complaint themes ordered by weight, heaviest first. */
  topThemes: string[];
  /** Themes appearing against enough distinct competitors to earn the bonus. */
  recurringThemes: string[];
}

/**
 * Complaint density -- the strongest signal.
 *
 * Two things make this different from counting angry posts:
 *
 * 1. The denominator is praise about the same competitor, not everything the
 *    gather returned. A run's retrieval volume is a function of how the query
 *    was phrased; the balance of grievance to satisfaction about a named
 *    product is not. It also means contentment is positively observed rather
 *    than inferred from silence, so a thin gather can no longer masquerade as
 *    a happy market.
 * 2. A theme recurring across several competitors is worth more than the same
 *    number of complaints about one, because that is a category-level failure
 *    rather than one bad product -- and a category-level failure is the wedge.
 */
export function complaintSignal(evidence: Evidence[], now: Date): ComplaintSignal {
  const complaints = byKind(evidence, "complaint");
  const praise = byKind(evidence, "praise");

  const competitorsByTheme = new Map<string, Set<string>>();
  for (const c of complaints) {
    if (!c.theme) continue;
    const set = competitorsByTheme.get(c.theme) ?? new Set<string>();
    set.add(c.competitorId);
    competitorsByTheme.set(c.theme, set);
  }

  const recurringThemes = [...competitorsByTheme.entries()]
    .filter(([, competitors]) => competitors.size >= RECURRENCE_MIN_COMPETITORS)
    .map(([theme]) => theme);
  const recurring = new Set(recurringThemes);

  const weigh = (source: Evidence["source"], postedAt: Date | undefined, theme?: string): number => {
    const base = recencyWeight(postedAt, now) * sourceWeight(source);
    const bonus = theme && recurring.has(theme) ? RECURRENCE_BONUS : 1;
    return base * bonus;
  };

  const complaintByCompetitor = new Map<string, number>();
  const praiseByCompetitor = new Map<string, number>();
  const themeWeight = new Map<string, number>();

  let complaintVolume = 0;
  for (const c of complaints) {
    const w = weigh(c.source, c.postedAt, c.theme);
    complaintVolume += w;
    complaintByCompetitor.set(c.competitorId, (complaintByCompetitor.get(c.competitorId) ?? 0) + w);
    if (c.theme) themeWeight.set(c.theme, (themeWeight.get(c.theme) ?? 0) + w);
  }

  let praiseVolume = 0;
  for (const p of praise) {
    const w = weigh(p.source, p.postedAt, p.theme);
    praiseVolume += w;
    praiseByCompetitor.set(p.competitorId, (praiseByCompetitor.get(p.competitorId) ?? 0) + w);
  }

  const topThemes = [...themeWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  // Weight each competitor's ratio by how much was said about it, so a product
  // with two data points does not outvote one with two hundred.
  let weightedRatioSum = 0;
  let totalTalk = 0;
  const competitorIds = new Set([...complaintByCompetitor.keys(), ...praiseByCompetitor.keys()]);
  for (const id of competitorIds) {
    const wc = complaintByCompetitor.get(id) ?? 0;
    const wp = praiseByCompetitor.get(id) ?? 0;
    const talk = wc + wp;
    if (talk === 0) continue;
    weightedRatioSum += (wc / talk) * talk;
    totalTalk += talk;
  }

  return {
    ratio: totalTalk === 0 ? 0 : weightedRatioSum / totalTalk,
    complaintVolume,
    praiseVolume,
    topThemes,
    recurringThemes,
  };
}
