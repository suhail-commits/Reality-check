import type { AdapterStatus, Confidence, Evidence, SourceId } from "@rc/shared";
import {
  HIGH_AGREEMENT,
  HIGH_COVERAGE,
  HIGH_EVIDENCE,
  HIGH_RECENCY_DAYS,
  MEDIUM_COVERAGE,
  MIN_EVIDENCE,
} from "./constants.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number);
}

/**
 * How much of what we said about this market is corroborated by more than one
 * source. A theme that only HN mentions might be one loud thread; a theme HN
 * and the app store both surface is a property of the market.
 */
function agreement(evidence: Evidence[]): number {
  const sourcesByTheme = new Map<string, Set<SourceId>>();
  for (const e of evidence) {
    if (e.kind !== "complaint" && e.kind !== "praise") continue;
    if (!e.theme) continue;
    const set = sourcesByTheme.get(e.theme) ?? new Set<SourceId>();
    set.add(e.source);
    sourcesByTheme.set(e.theme, set);
  }
  if (sourcesByTheme.size === 0) return 0;
  const corroborated = [...sourcesByTheme.values()].filter((s) => s.size >= 2).length;
  return corroborated / sourcesByTheme.size;
}

/**
 * Confidence is computed from coverage, never from a model's self-assessment.
 *
 * The rule that matters: a run where half the adapters dropped out cannot be
 * `high`, however clean the surviving evidence looks. A failing source degrades
 * confidence; it never crashes the run, and it never quietly passes as a full
 * result.
 *
 * A timeout is treated exactly like a failure here, which is what lets the
 * gather stage run under a wall-clock deadline without inventing a new concept.
 */
export function computeConfidence(
  evidence: Evidence[],
  adapterStatuses: Partial<Record<SourceId, AdapterStatus>>,
  now: Date,
): Confidence {
  const statuses = Object.entries(adapterStatuses) as [SourceId, AdapterStatus][];
  const attempted = statuses.filter(([, s]) => s !== "skipped").length;
  const returned = statuses.filter(([, s]) => s === "ok").length;
  const coverage = attempted === 0 ? 0 : returned / attempted;

  const ages = evidence
    .map((e) => e.postedAt)
    .filter((d): d is Date => d instanceof Date)
    .map((d) => (now.getTime() - d.getTime()) / MS_PER_DAY);
  const medianRecencyDays = median(ages);

  const crossSourceAgreement = agreement(evidence);
  const evidenceCount = evidence.length;

  const isHigh =
    coverage >= HIGH_COVERAGE &&
    evidenceCount >= HIGH_EVIDENCE &&
    medianRecencyDays !== null &&
    medianRecencyDays <= HIGH_RECENCY_DAYS &&
    crossSourceAgreement >= HIGH_AGREEMENT;

  const isMedium = coverage >= MEDIUM_COVERAGE && evidenceCount >= MIN_EVIDENCE;

  return {
    band: isHigh ? "high" : isMedium ? "medium" : "low",
    adaptersAttempted: attempted,
    adaptersReturned: returned,
    adapterStatuses: adapterStatuses as Record<SourceId, AdapterStatus>,
    evidenceCount,
    medianRecencyDays,
    crossSourceAgreement,
  };
}
