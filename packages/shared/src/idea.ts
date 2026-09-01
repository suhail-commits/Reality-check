import { z } from "zod";

/**
 * The interview's output, and the reason the interview stage exists. Competitors
 * feed a raw idea blob straight to the model; sharpening it into these fields is
 * where verdict quality is won. See design doc s11 stage 1.
 */
export const IdeaSpec = z.object({
  /** The pain, in the user's words, sharpened. */
  problem: z.string().min(1),
  /** Who opens their wallet. */
  payer: z.string().min(1),
  /** What they do today, including "nothing". */
  currentAlternative: z.string().min(1),
  /** What breaks if it stays unsolved. */
  costOfInaction: z.string().min(1),
  /** How the user thinks they are different. Rule 6a/6b tests against this. */
  statedWedge: z.string().optional(),
  /** Search terms for the gather stage. Accuracy of retrieval rests on these. */
  keywords: z.array(z.string().min(1)).min(1),
});
export type IdeaSpec = z.infer<typeof IdeaSpec>;

/** What an adapter is asked for. Wave 2 sets `competitor`; wave 1 does not. */
export const MarketQuery = z.object({
  keywords: z.array(z.string().min(1)).min(1),
  competitor: z.string().min(1).optional(),
});
export type MarketQuery = z.infer<typeof MarketQuery>;

/** An untyped item straight from a source, before extraction structures it. */
export const RawItem = z.object({
  source: z.string().min(1),
  url: z.string().url(),
  title: z.string().optional(),
  text: z.string(),
  author: z.string().optional(),
  postedAt: z.coerce.date().optional(),
  /** Set when this item came from a wave-2 query naming a competitor. */
  competitorId: z.string().optional(),
  /**
   * Source-specific facts extraction needs but the common shape has no room
   * for -- an archived GitHub repo is an obituary, and that flag has to survive
   * the trip from adapter to extractor.
   */
  meta: z.record(z.unknown()).optional(),
});
export type RawItem = z.infer<typeof RawItem>;
