import type {
  AdapterStatus,
  Competitor,
  Evidence,
  MarketShape,
  SourceId,
} from "@rc/shared";

/**
 * Everything the rubric is allowed to see. Note what is absent: no model, no
 * network, no clock. `now` is injected so the same evidence yields the same
 * verdict on any machine on any day -- which is what makes the eval harness
 * possible at all.
 */
export interface RubricInput {
  evidence: Evidence[];
  competitors: Competitor[];
  marketShape: MarketShape;
  adapterStatuses: Partial<Record<SourceId, AdapterStatus>>;
  /** How the user thinks they are different. Rule 6a tests against this. */
  statedWedge?: string;
  now: Date;
}
