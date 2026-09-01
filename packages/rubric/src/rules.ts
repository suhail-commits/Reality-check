import type { Scores, Verdict } from "@rc/shared";
import {
  COMPLAINT_RATIO_HIGH,
  COMPLAINT_RATIO_LOW,
  DEMAND_SIGNAL_FLOOR,
  FATAL_DEATH_COUNT,
  FEASIBILITY_ABSOLUTE,
  FEASIBILITY_FLOOR,
  MIN_EVIDENCE,
  MIN_PRAISE,
  TRAJECTORY_FLAT,
} from "./constants.js";

export interface Decision {
  verdict: Verdict;
  /** Which of the seven rules produced this. The first thing to read on a regression. */
  firedRule: number;
  reason: string;
}

/**
 * The seven decision rules, evaluated in order.
 *
 * A rules table rather than a weighted sum, because a weighted sum cannot be
 * argued with and cannot be unit-tested case by case. Every verdict this
 * project produces can be traced to exactly one numbered rule and the numbers
 * that tripped it.
 *
 * Two interpretation rules are asserted throughout, and they are the difference
 * between a credible tool and one that tells Airbnb no:
 *
 *   R1  Competitors existing is not a reason to say no. It proves people pay.
 *       The "no" signal is contentment: competitors exist AND nobody complains.
 *   R2  "Nothing like this exists" is a red flag, not a green light. An empty
 *       market usually means someone tried and died, or nobody wants it.
 */
export function decide(s: Scores): Decision {
  // 1. Too little to judge on. Said plainly rather than bluffed.
  if (s.evidenceVolume < MIN_EVIDENCE) {
    return {
      verdict: "GO_FIND_OUT",
      firedRule: 1,
      reason: `Only ${s.evidenceVolume} pieces of evidence were found, below the ${MIN_EVIDENCE} needed to judge this market.`,
    };
  }

  // 2. R2. Nobody built it and nobody is talking about it.
  if (s.competitorCount === 0 && s.demandSignal < DEMAND_SIGNAL_FLOOR) {
    return {
      verdict: "DONT_BUILD_IT",
      firedRule: 2,
      reason:
        "Nobody has built this and nobody is asking for it. An empty market is usually empty for a reason.",
    };
  }

  // 3. The market already rejected people, recently, for market reasons.
  if (s.recentDemandSideDeaths >= FATAL_DEATH_COUNT) {
    return {
      verdict: "DONT_BUILD_IT",
      firedRule: 3,
      reason: `${s.recentDemandSideDeaths} companies died here recently for lack of demand or broken economics, not for lack of execution.`,
    };
  }

  // 4. R1. Contentment, and only contentment, is the true no. `praiseVolume`
  //    is what makes this an observation rather than a report of our own
  //    failure to find anything.
  if (
    s.competitorCount >= 3 &&
    s.complaintRatio <= COMPLAINT_RATIO_LOW &&
    s.praiseVolume >= MIN_PRAISE &&
    s.trajectory <= TRAJECTORY_FLAT
  ) {
    return {
      verdict: "DONT_BUILD_IT",
      firedRule: 4,
      reason: `${s.competitorCount} products already serve this and users are largely happy with them, in a market that is not growing.`,
    };
  }

  // 5. Barriers a small team cannot cross. Absolute ones end it; steep ones
  //    only mean the stated approach is wrong.
  if (s.feasibility < FEASIBILITY_FLOOR) {
    const absolute = s.feasibility < FEASIBILITY_ABSOLUTE;
    return {
      verdict: absolute ? "DONT_BUILD_IT" : "BUILD_IT_DIFFERENTLY",
      firedRule: 5,
      reason: absolute
        ? "The barriers to entry here are absolute for a small team, not merely steep."
        : "There is a real opening, but the barriers rule out entering it head-on.",
    };
  }

  // 6. Angry users, a market that is not shrinking, and a way in. The only
  //    branch where the user's own idea, rather than the market, decides.
  if (
    s.complaintRatio >= COMPLAINT_RATIO_HIGH &&
    s.trajectory >= TRAJECTORY_FLAT &&
    s.feasibility >= FEASIBILITY_FLOOR
  ) {
    return s.wedgeMatchesTopCluster
      ? {
          verdict: "BUILD_IT",
          firedRule: 6,
          reason:
            "Users are actively unhappy with what exists, the market is not shrinking, and your angle lands on what they complain about most.",
        }
      : {
          verdict: "BUILD_IT_DIFFERENTLY",
          firedRule: 6,
          reason:
            "Users are actively unhappy with what exists, but not about the thing you are planning to fix.",
        };
  }

  // 7. Evidence exists but points nowhere decisive.
  return {
    verdict: "GO_FIND_OUT",
    firedRule: 7,
    reason:
      "The evidence is real but mixed: not enough grievance to call it an opening, not enough contentment to call it closed.",
  };
}
