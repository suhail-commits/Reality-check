import type { BarrierKind, Evidence, MarketShape } from "@rc/shared";
import { BARRIER_SEVERITY, IMPASSABLE_BARRIER_LOAD } from "../constants.js";
import { byKind, clamp } from "../weights.js";

export interface FeasibilitySignal {
  /** 100 is a laptop and a weekend; 0 is a banking licence. */
  score: number;
  /** Every distinct barrier that applies, whichever way it was established. */
  barriers: BarrierKind[];
  observed: BarrierKind[];
  structural: BarrierKind[];
}

/**
 * Barriers implied by the shape of the market rather than by anything anyone
 * wrote down. Nobody blogs "marketplaces need both sides", so these would never
 * appear as cited evidence -- but they are still true, and a rubric that missed
 * them would cheerfully tell a solo founder to go build Uber.
 *
 * The model picks the shape from a closed enum. This table, not the model,
 * decides what the shape costs.
 */
const STRUCTURAL: Record<MarketShape, BarrierKind[]> = {
  two_sided_marketplace: ["network_effects"],
  hardware: ["capital_intensity"],
  regulated_service: ["regulatory_burden"],
  consumer_app: ["distribution_lock"],
  developer_tool: [],
  single_player_saas: [],
  unknown: [],
};

/**
 * Entry feasibility -- could a small team with a laptop actually enter this?
 *
 * Barriers reach this function two ways and only two ways: cited in a `barrier`
 * evidence row, or implied by the market shape. Neither is a number the model
 * produced. That is the whole point -- a model scoring barriers 0-3 is an
 * opinion feeding a verdict, dressed as a rubric.
 */
export function feasibilitySignal(evidence: Evidence[], marketShape: MarketShape): FeasibilitySignal {
  const observed = [...new Set(byKind(evidence, "barrier").map((b) => b.barrier))];
  const structural = STRUCTURAL[marketShape];

  const barriers = [...new Set([...observed, ...structural])];
  const load = barriers.reduce((sum, b) => sum + BARRIER_SEVERITY[b], 0);

  return {
    score: clamp(100 - (load / IMPASSABLE_BARRIER_LOAD) * 100, 0, 100),
    barriers,
    observed,
    structural,
  };
}
