import { z } from "zod";
import { AdapterStatus, SourceId } from "./enums.js";
import { Redirect } from "./redirect.js";

/** Four outcomes. Never a numeric score as the headline. See design doc s5. */
export const Verdict = z.enum([
  "BUILD_IT",
  "BUILD_IT_DIFFERENTLY",
  "DONT_BUILD_IT",
  "GO_FIND_OUT",
]);
export type Verdict = z.infer<typeof Verdict>;

export const ConfidenceBand = z.enum(["high", "medium", "low"]);
export type ConfidenceBand = z.infer<typeof ConfidenceBand>;

/**
 * The four signals, plus the raw counts the decision rules read directly.
 * Every field here is computed by the rubric from evidence. None is supplied
 * by a model.
 */
export const Scores = z.object({
  /** Per-competitor mean of complaints / (complaints + praise). See s6.1. */
  complaintRatio: z.number().min(0).max(1),
  /**
   * Weighted praise actually observed. Load-bearing: without it, rule 4 fires
   * on the absence of complaints, which a thin gather produces just as readily
   * as a happy market.
   */
  praiseVolume: z.number().min(0),
  /** Total evidence rows backing this verdict. Rule 1 reads this. */
  evidenceVolume: z.number().int().min(0),
  /** Negative when deaths were demand-side; positive when exits exist. s6.2. */
  graveyard: z.number().min(-100).max(100),
  /** Normalised slope over 24 months. Negative is shrinking. s6.3. */
  trajectory: z.number().min(-1).max(1),
  /** 100 minus normalised barrier load. s6.4. */
  feasibility: z.number().min(0).max(100),
  /** How many distinct competitors were found. Rules 2 and 4 read this. */
  competitorCount: z.number().int().min(0),
  /**
   * Deaths from no_demand, unit_economics or regulatory within the recency
   * window. Rule 3 reads the count directly rather than the graveyard score,
   * because two demand-side deaths are a wall regardless of how many
   * acquisitions offset them in the aggregate.
   */
  recentDemandSideDeaths: z.number().int().min(0),
  /** Complaint, praise and trend rows combined. Rule 2 reads this. */
  demandSignal: z.number().int().min(0),
  /**
   * Whether the user's stated wedge lands on a top complaint cluster. This is
   * the only score that is personal to the user rather than to the market, and
   * it is the whole of rule 6a vs 6b.
   */
  wedgeMatchesTopCluster: z.boolean(),
});
export type Scores = z.infer<typeof Scores>;

/**
 * Confidence is computed from coverage, never from a model's self-report.
 * A run where half the adapters dropped out cannot be `high`, however clean
 * the surviving evidence looks. See design doc s7.2.
 */
export const Confidence = z.object({
  band: ConfidenceBand,
  adaptersAttempted: z.number().int().min(0),
  adaptersReturned: z.number().int().min(0),
  adapterStatuses: z.record(SourceId, AdapterStatus),
  evidenceCount: z.number().int().min(0),
  medianRecencyDays: z.number().min(0).nullable(),
  crossSourceAgreement: z.number().min(0).max(1),
});
export type Confidence = z.infer<typeof Confidence>;

/**
 * What the rubric returns. `firedRule` names which of the seven decision rules
 * produced the verdict -- the single most useful field when a case regresses.
 */
export const RubricResult = z.object({
  verdict: Verdict,
  confidence: Confidence,
  scores: Scores,
  firedRule: z.number().int().min(1).max(7),
  /** Plain-language statement of why that rule fired. Not model prose. */
  reason: z.string().min(1),
  /**
   * Where to aim instead. Null only when the evidence is too thin to point
   * anywhere, which is the same condition that produces GO FIND OUT.
   */
  redirect: Redirect.nullable(),
});
export type RubricResult = z.infer<typeof RubricResult>;
