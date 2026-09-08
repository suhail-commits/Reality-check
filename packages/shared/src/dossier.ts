import { z } from "zod";
import { AdapterStatus, MarketShape, SourceId } from "./enums.js";
import { Evidence } from "./evidence.js";
import { Redirect } from "./redirect.js";
import { IdeaSpec } from "./idea.js";
import { Confidence, Scores, Verdict } from "./verdict.js";

export const Competitor = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().optional(),
  pricing: z.string().optional(),
});
export type Competitor = z.infer<typeof Competitor>;

/** Clustered so the output reads "3 recurring themes", not "340 complaints". */
export const ComplaintCluster = z.object({
  theme: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  /** Distinct competitors this theme appears against. >=2 earns the bonus. */
  competitorIds: z.array(z.string().min(1)).min(1),
});
export type ComplaintCluster = z.infer<typeof ComplaintCluster>;

/**
 * The shared, cacheable research on a market. A user's specific twist is
 * evaluated against this rather than triggering a fresh gather.
 */
export const Dossier = z.object({
  id: z.string().min(1),
  marketId: z.string().min(1),
  marketShape: MarketShape,
  competitors: z.array(Competitor),
  complaintClusters: z.array(ComplaintCluster),
  evidence: z.array(Evidence),
  gatheredAt: z.coerce.date(),
  adapterStatuses: z.record(SourceId, AdapterStatus),
});
export type Dossier = z.infer<typeof Dossier>;

/** A single user's verdict. Backs the /v/[id] permalink. */
export const Validation = z.object({
  id: z.string().min(1),
  ideaText: z.string().min(1),
  ideaSpec: IdeaSpec,
  marketId: z.string().min(1),
  verdict: Verdict,
  confidence: Confidence,
  scores: Scores,
  firedRule: z.number().int().min(1).max(7),
  /**
   * Where to build instead. Present for every verdict except GO FIND OUT,
   * which has too little evidence to point anywhere and carries homework
   * instead. See `Redirect` for why it is never an uncited sentence.
   */
  redirect: Redirect.nullable(),
  prose: z.string(),
  /** Every id here must resolve, or the sentence citing it was dropped. */
  citedEvidenceIds: z.array(z.string().min(1)),
  createdAt: z.coerce.date(),
});
export type Validation = z.infer<typeof Validation>;
