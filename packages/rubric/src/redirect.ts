import type { Competitor, Evidence, Redirect, RedirectStrength } from "@rc/shared";
import { RECURRENCE_MIN_COMPETITORS, STRONG_REDIRECT_MIN_EVIDENCE } from "./constants.js";
import { byKind, recencyWeight, sourceWeight } from "./weights.js";

interface Cluster {
  theme: string;
  weight: number;
  evidenceIds: string[];
  competitorIds: string[];
}

const STOP = new Set([
  "a", "an", "and", "app", "are", "for", "the", "that", "this", "with", "your", "you", "not",
  "cannot", "any", "good", "too", "big", "from", "when", "goes", "wrong", "nobody", "tell", "get",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

function overlaps(a: string, b: string): boolean {
  const left = tokens(a);
  if (left.size === 0) return false;
  for (const token of tokens(b)) if (left.has(token)) return true;
  return false;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * Where to build instead.
 *
 * The product promises to show you the opening, and the only way to keep that
 * promise without inventing one is to *derive* it. A complaint theme that
 * recurs across several competitors is not one bad company -- it is a gap none
 * of them has closed, which is the definition of an opening. The rubric already
 * weighs those clusters for the complaint ratio, so the heaviest one the user's
 * own angle does not already cover falls straight out of work it is doing anyway.
 *
 * Three things this deliberately does not do:
 *
 * 1. **It never asks a model.** The redirect is arithmetic over evidence, so it
 *    is reproducible and cannot be hallucinated -- the same guarantee the
 *    verdict itself has.
 * 2. **It never returns a redirect without a citation.** Strength grades the
 *    confidence of the inference, never whether a source exists. `speculative`
 *    still points at a real quote; it just says out loud that we are reading
 *    more into it than the evidence strictly supports.
 * 3. **It prefers something the user has not thought of.** A tool that answers
 *    "your idea is good, do your idea" is worth little, so the cluster their
 *    stated angle already covers is ranked last. It is not discarded, though:
 *    sometimes the angle they brought really is the loudest complaint in the
 *    market, and confirming that with evidence beats going quiet.
 */
export function chooseRedirect(
  evidence: Evidence[],
  competitors: Competitor[],
  statedWedge: string | undefined,
  now: Date,
): Redirect | null {
  const complaints = byKind(evidence, "complaint").filter((c) => c.theme);
  const nameOf = new Map(competitors.map((c) => [c.id, c.name]));

  const byTheme = new Map<string, Cluster>();
  for (const c of complaints) {
    const theme = c.theme as string;
    const cluster = byTheme.get(theme) ?? {
      theme,
      weight: 0,
      evidenceIds: [],
      competitorIds: [],
    };
    cluster.weight += recencyWeight(c.postedAt, now) * sourceWeight(c.source);
    cluster.evidenceIds.push(c.id);
    if (!cluster.competitorIds.includes(c.competitorId)) {
      cluster.competitorIds.push(c.competitorId);
    }
    byTheme.set(theme, cluster);
  }

  const ranked = [...byTheme.values()].sort((a, b) => b.weight - a.weight);

  // Whatever the user already plans to fix is not news to them, so prefer
  // something they have not thought of. But when their angle *is* the heaviest
  // complaint -- Dropbox in 2007, where the only grievance was that sync broke
  // and the founder's whole plan was sync that works -- the honest answer is to
  // confirm it with the evidence, not to fall silent looking for a different one.
  const unaddressed = ranked.filter(
    (cluster) => !(statedWedge && overlaps(statedWedge, cluster.theme)),
  );
  const best = unaddressed[0] ?? ranked[0];
  const confirms = best !== undefined && unaddressed[0] === undefined;

  if (best) {
    const spread = best.competitorIds.length;
    const recurring = spread >= RECURRENCE_MIN_COMPETITORS;
    const strength: RedirectStrength =
      recurring && best.evidenceIds.length >= STRONG_REDIRECT_MIN_EVIDENCE ? "strong" : "thin";

    const who = best.competitorIds.map((id) => nameOf.get(id) ?? id);

    return {
      theme: best.theme,
      strength,
      basis: confirms
        ? `This is what you already said you would fix, and it is the loudest complaint in the market: ${best.evidenceIds.length} ${plural(best.evidenceIds.length, "person", "people")} raised it${who.length > 0 ? ` about ${who.join(" and ")}` : ""}. You are aiming at the right thing.`
        : strength === "strong"
          ? `${best.evidenceIds.length} people raised this across ${who.join(" and ")}. A complaint that follows users from one product to the next is a gap none of them has closed.`
          : `${best.evidenceIds.length} ${plural(best.evidenceIds.length, "person", "people")} raised this${who.length > 0 ? ` about ${who.join(" and ")}` : ""}. Real, but check how widely it is felt before betting on it.`,
      evidenceIds: best.evidenceIds,
      competitorIds: best.competitorIds,
    };
  }

  // Nobody is complaining about anything we can attribute. The graveyard is the
  // only place left that says something about what this market wants, so read
  // it -- and say plainly that we are reading rather than observing.
  const obituaries = byKind(evidence, "obituary");
  const informative = obituaries.filter(
    (o) => o.causeOfDeath !== "unknown" && o.causeOfDeath !== "acquired",
  );
  const source = informative[0] ?? obituaries[0];
  if (!source) return null;

  return {
    theme: `whatever ${source.name} could not make work`,
    strength: "speculative",
    basis: `Nobody is complaining about the products that exist, so there is no gap to point at. ${source.name} shut down here (${source.causeOfDeath.replace(/_/g, " ")}), and that is the only signal about what this market actually wants. This is our reading, not the market's.`,
    evidenceIds: [source.id],
    competitorIds: [],
  };
}
