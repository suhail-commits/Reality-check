import type { Evidence, SourceId } from "@rc/shared";
import { RECENCY_HALF_LIFE_MONTHS, SOURCE_WEIGHT } from "./constants.js";

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export function monthsBetween(earlier: Date, later: Date): number {
  return Math.max(0, (later.getTime() - earlier.getTime()) / MS_PER_MONTH);
}

/**
 * Exponential decay on a half-life. Evidence with no date is treated as being
 * exactly one half-life old: not discarded, not trusted as fresh.
 */
export function recencyWeight(postedAt: Date | undefined, now: Date, halfLifeMonths = RECENCY_HALF_LIFE_MONTHS): number {
  if (!postedAt) return 0.5;
  return Math.pow(0.5, monthsBetween(postedAt, now) / halfLifeMonths);
}

export function sourceWeight(source: SourceId): number {
  return SOURCE_WEIGHT[source];
}

export function isRecent(postedAt: Date | undefined, now: Date, withinMonths: number): boolean {
  if (!postedAt) return false;
  return monthsBetween(postedAt, now) <= withinMonths;
}

export function byKind<K extends Evidence["kind"]>(
  evidence: Evidence[],
  kind: K,
): Extract<Evidence, { kind: K }>[] {
  return evidence.filter((e): e is Extract<Evidence, { kind: K }> => e.kind === kind);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
