import type { Dossier, IdeaSpec, SourceId, TraceEvent } from "@rc/shared";
import type { Fetcher, SourceAdapter } from "@rc/sources";
import type { Models } from "./model.js";

export interface MarketRecord {
  id: string;
  name: string;
  keywords: string[];
}

/**
 * Persistence, injected. In-memory in tests, Neon Postgres in production.
 * The stages never learn which.
 */
export interface MarketStore {
  list(): Promise<MarketRecord[]>;
  create(market: Omit<MarketRecord, "id">): Promise<MarketRecord>;
  dossier(marketId: string): Promise<Dossier | null>;
  saveDossier(dossier: Dossier): Promise<void>;
}

/**
 * How close two markets are, 0 to 1.
 *
 * The default is lexical (`lexicalSimilarity`) because the rubric's purity rule
 * extends here by habit: no network in the hot path, nothing to pay for, and a
 * result that is identical on every machine. A real local embedding model
 * (fastembed class, still free) plugs in here and will match
 * "Uber for dog walking" to "a marketplace for pet care" -- which lexical
 * scoring cannot do, and is the main thing that will lift the cache hit rate.
 */
export type Similarity = (a: string[], b: string[]) => number;

export interface EngineDeps {
  models: Models;
  adapters: readonly SourceAdapter[];
  fetch: Fetcher;
  store: MarketStore;
  similarity?: Similarity;
  now: () => Date;
  /** Wall-clock budget for gather. See the 60s Vercel Hobby ceiling. */
  gatherDeadlineMs?: number;
  /** How close is close enough to reuse a dossier. Deliberately high. */
  matchThreshold?: number;
}

export interface RunInput {
  ideaText: string;
  /** Answers to the three interview questions. Any may be missing. */
  answers?: Partial<Record<"payer" | "alternative" | "inaction", string>>;
  /** Set when the user rejected a match and asked for a fresh gather. */
  forceFresh?: boolean;
}

export interface RunResult {
  spec: IdeaSpec;
  market: MarketRecord;
  dossier: Dossier;
  verdict: import("@rc/shared").Validation;
  adapterStatuses: Partial<Record<SourceId, AdapterStatusValue>>;
}

type AdapterStatusValue = import("@rc/shared").AdapterStatus;

export type Emit = (event: TraceEvent) => void;

const WORD = /[^a-z0-9]+/;
const STOP = new Set([
  "the", "for", "and", "app", "with", "that", "this", "your", "you", "are", "from", "any",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(WORD)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Jaccard overlap on keyword tokens. Deterministic, free, no network. */
export const lexicalSimilarity: Similarity = (a, b) => {
  const left = new Set(a.flatMap(tokenize));
  const right = new Set(b.flatMap(tokenize));
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / (left.size + right.size - shared);
};
