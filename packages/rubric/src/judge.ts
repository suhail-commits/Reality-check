import type { RubricResult, Scores } from "@rc/shared";
import { computeConfidence } from "./confidence.js";
import { chooseRedirect } from "./redirect.js";
import { decide } from "./rules.js";
import { complaintSignal } from "./signals/complaints.js";
import { feasibilitySignal } from "./signals/feasibility.js";
import { graveyardSignal } from "./signals/graveyard.js";
import { trajectorySignal } from "./signals/trajectory.js";
import type { RubricInput } from "./types.js";

/** How many of the heaviest themes the wedge is allowed to land on. */
const TOP_CLUSTER_DEPTH = 3;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "in", "is", "it", "of",
  "on", "or", "that", "the", "their", "them", "they", "this", "to", "was", "with", "you", "your",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t)),
  );
}

/**
 * Lexical, deliberately. The rubric is pure -- no model, no embeddings, no
 * network -- so the honest default is word overlap against the heaviest
 * complaint themes. The engine can compute a better semantic answer and pass it
 * in via `wedgeMatchesTopCluster`; this is the floor, not the ceiling.
 */
function wedgeLandsOnTopCluster(statedWedge: string | undefined, topThemes: string[]): boolean {
  if (!statedWedge) return false;
  const wedge = tokens(statedWedge);
  if (wedge.size === 0) return false;

  return topThemes.slice(0, TOP_CLUSTER_DEPTH).some((theme) => {
    for (const token of tokens(theme)) if (wedge.has(token)) return true;
    return false;
  });
}

/**
 * Evidence in, verdict out. Pure: no network, no model, no clock of its own.
 *
 * The whole architectural stance of this project lives in this signature. The
 * model never appears here, so a verdict cannot be hallucinated -- the same
 * evidence produces the same verdict on any machine on any day, which is also
 * what makes the historical eval cases possible at all.
 */
export function judge(input: RubricInput & { wedgeMatchesTopCluster?: boolean }): RubricResult {
  const { evidence, competitors, marketShape, adapterStatuses, statedWedge, now } = input;

  const complaints = complaintSignal(evidence, now);
  const graveyard = graveyardSignal(evidence, now);
  const trajectory = trajectorySignal(evidence, now);
  const feasibility = feasibilitySignal(evidence, marketShape);

  const demandSignal = evidence.filter(
    (e) => e.kind === "complaint" || e.kind === "praise" || e.kind === "trend_point",
  ).length;

  const scores: Scores = {
    complaintRatio: complaints.ratio,
    praiseVolume: complaints.praiseVolume,
    evidenceVolume: evidence.length,
    graveyard: graveyard.score,
    trajectory: trajectory.slope,
    feasibility: feasibility.score,
    competitorCount: competitors.length,
    recentDemandSideDeaths: graveyard.recentDemandSideDeaths,
    demandSignal,
    wedgeMatchesTopCluster:
      input.wedgeMatchesTopCluster ?? wedgeLandsOnTopCluster(statedWedge, complaints.topThemes),
  };

  const decision = decide(scores);

  return {
    verdict: decision.verdict,
    firedRule: decision.firedRule,
    reason: decision.reason,
    scores,
    confidence: computeConfidence(evidence, adapterStatuses, now),
    // Where to aim instead. Derived from the same evidence, by the same pure
    // function, so the recommendation cannot be hallucinated any more than the
    // verdict can. Null only when there is nothing to point at, which is the
    // condition that produces GO FIND OUT anyway.
    redirect: chooseRedirect(evidence, competitors, statedWedge, now),
  };
}
