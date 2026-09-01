import type { AdapterStatus, MarketQuery, RawItem, SourceId } from "@rc/shared";

/** What an adapter contributes. One adapter may feed several. */
export type Feed = "complaints" | "competitors" | "graveyard" | "trend";

/**
 * Injected rather than imported, so an adapter can be tested against a recorded
 * payload without a network, a key, or a live service that might have changed
 * its shape since the test was written.
 */
export type Fetcher = (
  url: string,
  init: { signal: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>;

export interface AdapterContext {
  fetch: Fetcher;
  /** Carries the gather deadline. Adapters must pass it to every request. */
  signal: AbortSignal;
  now: Date;
}

export interface RateLimitPolicy {
  /** Minimum gap between requests to this source. */
  minIntervalMs: number;
  /** Requests allowed to go out back-to-back before the gap applies. */
  burst: number;
}

export interface SourceAdapter {
  id: SourceId;
  feeds: readonly Feed[];
  /**
   * A missing key or absent config makes an adapter unavailable, never an
   * error. It drops out of the run and lowers confidence, which is a result;
   * throwing would be a crash.
   */
  enabled(): boolean;
  fetch(query: MarketQuery, ctx: AdapterContext): Promise<RawItem[]>;
  rateLimit: RateLimitPolicy;
}

export interface AdapterOutcome {
  adapter: SourceId;
  status: AdapterStatus;
  items: RawItem[];
  ms: number;
  /** Present on `failed`. Recorded for the trace, never thrown. */
  error?: string;
}

export interface GatherOutcome {
  items: RawItem[];
  outcomes: AdapterOutcome[];
  statuses: Partial<Record<SourceId, AdapterStatus>>;
}
