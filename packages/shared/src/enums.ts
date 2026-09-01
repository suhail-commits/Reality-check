import { z } from "zod";

/** Adapters shipping in v1 need no API key; the rest are v2. See design doc s12. */
export const SourceId = z.enum([
  "hn",
  "github",
  "reddit",
  "search",
  "appstore",
  "packages",
  "trends",
]);
export type SourceId = z.infer<typeof SourceId>;

export const V1_SOURCES: readonly SourceId[] = ["hn", "github"];

/**
 * How an adapter finished. All four outcomes feed the confidence model
 * identically -- a timeout is not an error, it is one more way to degrade.
 */
export const AdapterStatus = z.enum(["ok", "failed", "skipped", "timed_out"]);
export type AdapterStatus = z.infer<typeof AdapterStatus>;

/**
 * Cause of death flips the sign of an obituary. Deaths from lack of demand are
 * a wall; deaths from execution are noise. See design doc s6.2.
 */
export const CauseOfDeath = z.enum([
  "no_demand",
  "unit_economics",
  "regulatory",
  "execution",
  "founder_quit",
  "ran_out_of_runway",
  "acquired",
  "pivoted_away",
  "unknown",
]);
export type CauseOfDeath = z.infer<typeof CauseOfDeath>;

/**
 * A closed label the model may pick. The rubric maps it to structural barriers.
 * The model classifies; only the rubric counts. See design doc s6.4 and s8.
 */
export const MarketShape = z.enum([
  "single_player_saas",
  "two_sided_marketplace",
  "consumer_app",
  "developer_tool",
  "hardware",
  "regulated_service",
  "unknown",
]);
export type MarketShape = z.infer<typeof MarketShape>;

export const BarrierKind = z.enum([
  "capital_intensity",
  "regulatory_burden",
  "network_effects",
  "data_moat",
  "switching_costs",
  "distribution_lock",
]);
export type BarrierKind = z.infer<typeof BarrierKind>;

export const PipelineStage = z.enum([
  "interview",
  "canonicalize",
  "gather",
  "extract",
  "judge",
]);
export type PipelineStage = z.infer<typeof PipelineStage>;
