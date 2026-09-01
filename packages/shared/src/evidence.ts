import { z } from "zod";
import { BarrierKind, CauseOfDeath, SourceId } from "./enums.js";

/**
 * Every evidence row carries a resolvable URL and a verbatim quote. This is the
 * schema-level half of "no citation, no claim" -- a row that cannot be cited
 * cannot be constructed, so an uncited claim has nowhere to come from.
 */
const EvidenceBase = z.object({
  id: z.string().min(1),
  source: SourceId,
  url: z.string().url(),
  quote: z.string().min(1),
  author: z.string().optional(),
  postedAt: z.coerce.date().optional(),
  retrievedAt: z.coerce.date(),
});

/**
 * Complaints and praise are both attributed to a competitor, because the
 * complaint ratio is computed per competitor rather than per run. Without
 * `competitorId` the denominator is whatever the search query happened to
 * return. See design doc s6.1.
 */
const Attributed = EvidenceBase.extend({
  competitorId: z.string().min(1),
  theme: z.string().optional(),
});

export const ComplaintEvidence = Attributed.extend({ kind: z.literal("complaint") });
export const PraiseEvidence = Attributed.extend({ kind: z.literal("praise") });

export const CompetitorEvidence = EvidenceBase.extend({
  kind: z.literal("competitor"),
  competitorId: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().optional(),
  pricing: z.string().optional(),
});

export const ObituaryEvidence = EvidenceBase.extend({
  kind: z.literal("obituary"),
  name: z.string().min(1),
  causeOfDeath: CauseOfDeath,
  diedAt: z.coerce.date().optional(),
});

export const BarrierEvidence = EvidenceBase.extend({
  kind: z.literal("barrier"),
  barrier: BarrierKind,
});

export const TrendPointEvidence = EvidenceBase.extend({
  kind: z.literal("trend_point"),
  series: z.string().min(1),
  at: z.coerce.date(),
  value: z.number(),
});

export const Evidence = z.discriminatedUnion("kind", [
  ComplaintEvidence,
  PraiseEvidence,
  CompetitorEvidence,
  ObituaryEvidence,
  BarrierEvidence,
  TrendPointEvidence,
]);
export type Evidence = z.infer<typeof Evidence>;

export type ComplaintEvidence = z.infer<typeof ComplaintEvidence>;
export type PraiseEvidence = z.infer<typeof PraiseEvidence>;
export type CompetitorEvidence = z.infer<typeof CompetitorEvidence>;
export type ObituaryEvidence = z.infer<typeof ObituaryEvidence>;
export type BarrierEvidence = z.infer<typeof BarrierEvidence>;
export type TrendPointEvidence = z.infer<typeof TrendPointEvidence>;
