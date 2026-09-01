import type { AdapterStatus, IdeaSpec, RawItem, SourceId } from "@rc/shared";
import { gather as runAdapters, type Fetcher, type SourceAdapter } from "@rc/sources";
import type { Emit } from "../types.js";

export interface GatherResult {
  items: RawItem[];
  statuses: Partial<Record<SourceId, AdapterStatus>>;
  competitorNames: string[];
}

/** Worst status wins: a source that failed in either wave did not fully return. */
const RANK: Record<AdapterStatus, number> = { ok: 0, skipped: 1, timed_out: 2, failed: 3 };

function merge(
  a: Partial<Record<SourceId, AdapterStatus>>,
  b: Partial<Record<SourceId, AdapterStatus>>,
): Partial<Record<SourceId, AdapterStatus>> {
  const out = { ...a };
  for (const [id, status] of Object.entries(b) as [SourceId, AdapterStatus][]) {
    const existing = out[id];
    if (!existing || RANK[status] > RANK[existing]) out[id] = status;
  }
  return out;
}

/**
 * Stage 3 -- Gather, in two waves.
 *
 * Wave 1 asks the market terms and finds out who already does this. Wave 2 then
 * asks about each of those competitors *by name*.
 *
 * The second wave is not an optimisation. It is what makes the complaint ratio
 * mean anything: dividing grievances by everything a query happened to return
 * measures the query, whereas "of everything said about Calendly, what share is
 * a complaint" measures the market. Wave-2 queries are the competitor's own
 * name, so they are neutral by construction.
 *
 * The whole thing runs under one wall-clock deadline, split across the waves.
 * An adapter still working when it expires is recorded as `timed_out` and costs
 * confidence -- the 60-second serverless ceiling produces a weaker verdict, not
 * a failed one.
 */
export async function gatherBothWaves(
  spec: IdeaSpec,
  adapters: readonly SourceAdapter[],
  deps: {
    fetch: Fetcher;
    now: Date;
    deadlineMs: number;
    findCompetitors: (items: RawItem[]) => Promise<string[]>;
    emit: Emit;
    signal?: AbortSignal;
  },
): Promise<GatherResult> {
  const startedAt = Date.now();
  // Wave 1 discovers; wave 2 does the heavier per-competitor work, so it gets
  // the larger share of the budget.
  const wave1Budget = Math.max(1, Math.floor(deps.deadlineMs * 0.4));

  deps.emit({ type: "note", at: deps.now, text: "Wave 1 - finding who already does this" });

  const wave1 = await runAdapters(adapters, { keywords: spec.keywords }, {
    fetch: deps.fetch,
    now: deps.now,
    deadlineMs: wave1Budget,
    ...(deps.signal ? { signal: deps.signal } : {}),
  });

  for (const o of wave1.outcomes) {
    deps.emit({
      type: "adapter_result",
      at: new Date(),
      adapter: o.adapter,
      status: o.status,
      wave: 1,
      items: o.items.length,
      ms: o.ms,
    });
  }

  const competitorNames = await deps.findCompetitors(wave1.items);
  deps.emit({
    at: new Date(),
    type: "note",
    text:
      competitorNames.length > 0
        ? `${competitorNames.length} competitors found: ${competitorNames.slice(0, 4).join(", ")}`
        : "No existing products found for this",
  });

  const remaining = deps.deadlineMs - (Date.now() - startedAt);
  if (competitorNames.length === 0 || remaining <= 0) {
    return { items: wave1.items, statuses: wave1.statuses, competitorNames };
  }

  deps.emit({
    at: new Date(),
    type: "note",
    text: "Wave 2 - asking what people say about each of them",
  });

  // Every competitor gets an equal slice, so one slow name cannot starve the
  // rest and leave the ratio computed from a single product.
  const perCompetitor = Math.max(1, Math.floor(remaining / competitorNames.length));

  const waves = await Promise.all(
    competitorNames.map((competitor) =>
      runAdapters(adapters, { keywords: spec.keywords, competitor }, {
        fetch: deps.fetch,
        now: deps.now,
        deadlineMs: perCompetitor,
        ...(deps.signal ? { signal: deps.signal } : {}),
      }),
    ),
  );

  let statuses = wave1.statuses;
  const items = [...wave1.items];

  for (const wave of waves) {
    items.push(...wave.items);
    statuses = merge(statuses, wave.statuses);
  }

  for (const [id, status] of Object.entries(statuses) as [SourceId, AdapterStatus][]) {
    if (status !== "ok") {
      deps.emit({
        at: new Date(),
        type: "degraded",
        stage: "gather",
        reason: `${id} ${status.replace("_", " ")} - confidence lowered`,
      });
    }
  }

  return { items, statuses, competitorNames };
}
