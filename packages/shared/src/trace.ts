import { z } from "zod";
import { AdapterStatus, PipelineStage, SourceId } from "./enums.js";
import { Verdict } from "./verdict.js";

/**
 * The seam between the engine and everything that watches it.
 *
 * The CLI pretty-prints this stream and the web app renders it. Because it is a
 * real schema rather than an implementation detail, `apps/web` can be built and
 * deployed against a *recorded* stream before `packages/engine` exists -- which
 * is what lets the UI ship at step 4 instead of step 8. See design doc s15.
 */
const Base = z.object({ at: z.coerce.date() });

export const StageStart = Base.extend({
  type: z.literal("stage_start"),
  stage: PipelineStage,
});

export const StageEnd = Base.extend({
  type: z.literal("stage_end"),
  stage: PipelineStage,
  ms: z.number().min(0),
});

/** One adapter finished. `timed_out` is as ordinary an outcome as `ok`. */
export const AdapterResult = Base.extend({
  type: z.literal("adapter_result"),
  adapter: SourceId,
  status: AdapterStatus,
  /** Which gather wave: 1 discovers competitors, 2 attributes talk to them. */
  wave: z.union([z.literal(1), z.literal(2)]),
  items: z.number().int().min(0),
  ms: z.number().min(0),
});

/**
 * The cache hit, stated out loud. The system is allowed to match the wrong
 * market; it is not allowed to do so silently, so this event is what the UI
 * renders beside the "not my market" control. See design doc s11 stage 2.
 */
export const MarketMatched = Base.extend({
  type: z.literal("market_matched"),
  marketId: z.string().min(1),
  name: z.string().min(1),
  similarity: z.number().min(0).max(1),
  fresh: z.boolean(),
});

/** Human-readable progress, e.g. "47 HN threads, 3 shutdowns found". */
export const Note = Base.extend({
  type: z.literal("note"),
  text: z.string().min(1),
});

/** A stage degraded. Never fatal on its own -- it lowers confidence. */
export const Degraded = Base.extend({
  type: z.literal("degraded"),
  stage: PipelineStage,
  reason: z.string().min(1),
});

export const VerdictReached = Base.extend({
  type: z.literal("verdict"),
  validationId: z.string().min(1),
  verdict: Verdict,
});

export const TraceEvent = z.discriminatedUnion("type", [
  StageStart,
  StageEnd,
  AdapterResult,
  MarketMatched,
  Note,
  Degraded,
  VerdictReached,
]);
export type TraceEvent = z.infer<typeof TraceEvent>;
