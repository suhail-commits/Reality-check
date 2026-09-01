import type { AdapterStatus, MarketQuery, SourceId } from "@rc/shared";
import { RateLimiter } from "./rate-limit.js";
import type { AdapterOutcome, Fetcher, GatherOutcome, SourceAdapter } from "./types.js";

export interface GatherOptions {
  fetch: Fetcher;
  now: Date;
  /**
   * Wall-clock budget for the whole wave.
   *
   * Vercel's Hobby tier kills a function at 60 seconds and streaming does not
   * evade that, so the run has to finish well inside it. An adapter still
   * working when this expires is recorded as `timed_out` -- which flows into
   * the confidence model exactly like a failure, because from the verdict's
   * point of view they are the same thing: a source that did not contribute.
   *
   * The ceiling therefore produces a weaker verdict, never a broken page.
   */
  deadlineMs: number;
  /** Caller's own cancellation, e.g. the browser hung up. */
  signal?: AbortSignal;
}

function isAbort(error: unknown): boolean {
  return (
    (error instanceof Error && (error.name === "AbortError" || error.message === "aborted")) ||
    (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
  );
}

/**
 * Runs one gather wave.
 *
 * The contract that makes seven adapters safe to own and two safe to ship:
 * **this function never rejects.** Every way a source can fail -- missing key,
 * thrown error, bad status, running out of time -- comes back as a status on
 * the outcome. Callers get partial results and a record of what was lost, and
 * the confidence model turns that record into an honest band.
 */
export async function gather(
  adapters: readonly SourceAdapter[],
  query: MarketQuery,
  options: GatherOptions,
): Promise<GatherOutcome> {
  const limiters = new Map<SourceId, RateLimiter>();
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.deadlineMs);

  const onCallerAbort = () => timeout.abort();
  options.signal?.addEventListener("abort", onCallerAbort, { once: true });

  const outcomes: AdapterOutcome[] = [];

  try {
    await Promise.all(
      adapters.map(async (adapter) => {
        if (!adapter.enabled()) {
          outcomes.push({ adapter: adapter.id, status: "skipped", items: [], ms: 0 });
          return;
        }

        const startedAt = Date.now();
        const limiter =
          limiters.get(adapter.id) ?? new RateLimiter(adapter.rateLimit);
        limiters.set(adapter.id, limiter);

        try {
          await limiter.take(timeout.signal);
          const items = await adapter.fetch(query, {
            fetch: options.fetch,
            signal: timeout.signal,
            now: options.now,
          });
          outcomes.push({
            adapter: adapter.id,
            status: "ok",
            items,
            ms: Date.now() - startedAt,
          });
        } catch (error) {
          // Out of time and genuinely broken are different facts about the run,
          // even though they cost the same confidence.
          const status: AdapterStatus =
            timeout.signal.aborted || isAbort(error) ? "timed_out" : "failed";
          outcomes.push({
            adapter: adapter.id,
            status,
            items: [],
            ms: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onCallerAbort);
  }

  outcomes.sort((a, b) => adapters.findIndex((x) => x.id === a.adapter) - adapters.findIndex((x) => x.id === b.adapter));

  const statuses: Partial<Record<SourceId, AdapterStatus>> = {};
  for (const o of outcomes) statuses[o.adapter] = o.status;

  return {
    items: outcomes.flatMap((o) => o.items),
    outcomes,
    statuses,
  };
}

/** Adapters that need no key, in the order they should be tried. */
export function v1Adapters(all: readonly SourceAdapter[]): SourceAdapter[] {
  return all.filter((a) => a.id === "hn" || a.id === "github");
}
