import type { CauseOfDeath, Evidence } from "@rc/shared";
import { DEATH_HALF_LIFE_MONTHS, DEATH_RECENCY_MONTHS } from "../constants.js";
import { byKind, clamp, isRecent, recencyWeight } from "../weights.js";

export interface GraveyardSignal {
  /** Negative when the market rejected people, positive when it bought them. */
  score: number;
  /** Deaths that indict the market rather than the founder. Rule 3 reads this. */
  recentDemandSideDeaths: number;
  acquisitions: number;
}

/**
 * Causes that indict the market itself. The naive reading -- startups died
 * here, therefore no -- is what would have killed Airbnb and Dropbox, so the
 * cause has to flip the sign rather than the count.
 */
const DEMAND_SIDE: readonly CauseOfDeath[] = ["no_demand", "unit_economics", "regulatory"];

/** They failed; the idea did not. These contribute nothing in either direction. */
const NEUTRAL: readonly CauseOfDeath[] = [
  "execution",
  "founder_quit",
  "ran_out_of_runway",
  "unknown",
];

const DEMAND_PENALTY = 40;
const PIVOT_PENALTY = 10;
const ACQUISITION_CREDIT = 25;

/**
 * The graveyard -- cause of death matters more than the death.
 *
 * A market with five execution failures and two acquisitions is attractive: it
 * proves people pay and that exits exist. A market with two demand-side deaths
 * is a wall. Both look identical if you only count headstones.
 */
export function graveyardSignal(evidence: Evidence[], now: Date): GraveyardSignal {
  const obituaries = byKind(evidence, "obituary");

  let demandWeight = 0;
  let pivotWeight = 0;
  let acquiredWeight = 0;
  let recentDemandSideDeaths = 0;
  let acquisitions = 0;

  for (const o of obituaries) {
    const died = o.diedAt ?? o.postedAt;
    const w = recencyWeight(died, now, DEATH_HALF_LIFE_MONTHS);

    if (DEMAND_SIDE.includes(o.causeOfDeath)) {
      demandWeight += w;
      if (isRecent(died, now, DEATH_RECENCY_MONTHS)) recentDemandSideDeaths++;
      continue;
    }
    if (o.causeOfDeath === "acquired") {
      acquiredWeight += w;
      acquisitions++;
      continue;
    }
    if (o.causeOfDeath === "pivoted_away") {
      pivotWeight += w;
      continue;
    }
    // NEUTRAL causes deliberately contribute nothing.
    void NEUTRAL;
  }

  const score = clamp(
    acquiredWeight * ACQUISITION_CREDIT -
      demandWeight * DEMAND_PENALTY -
      pivotWeight * PIVOT_PENALTY,
    -100,
    100,
  );

  return { score, recentDemandSideDeaths, acquisitions };
}
