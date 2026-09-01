export { gather, v1Adapters, type GatherOptions } from "./registry.js";
export { RateLimiter } from "./rate-limit.js";
export { cached, cacheKey, DiskCache, MemoryCache, type ResponseCache } from "./cache.js";
export { hn, toPlainText } from "./adapters/hn.js";
export { github } from "./adapters/github.js";
export type {
  AdapterContext,
  AdapterOutcome,
  Feed,
  Fetcher,
  GatherOutcome,
  RateLimitPolicy,
  SourceAdapter,
} from "./types.js";

import { github } from "./adapters/github.js";
import { hn } from "./adapters/hn.js";
import type { SourceAdapter } from "./types.js";

/** Everything v1 ships. Both keyless; together they cover all four signals. */
export const ADAPTERS: readonly SourceAdapter[] = [hn, github];
