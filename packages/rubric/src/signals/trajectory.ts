import type { Evidence } from "@rc/shared";
import { clamp } from "../weights.js";

export interface TrajectorySignal {
  /** Normalised change over the window. Negative is shrinking. */
  slope: number;
  /** How many series contributed. Zero lowers confidence, not the score. */
  seriesCount: number;
}

const WINDOW_MONTHS = 24;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/**
 * Least-squares slope in units per month.
 */
function slopePerMonth(points: { at: Date; value: number }[]): number | null {
  if (points.length < 2) return null;

  const t = points.map((p) => p.at.getTime() / MS_PER_MONTH);
  const meanT = t.reduce((a, b) => a + b, 0) / t.length;
  const meanV = points.reduce((a, p) => a + p.value, 0) / points.length;

  let num = 0;
  let den = 0;
  for (let i = 0; i < points.length; i++) {
    const dt = (t[i] as number) - meanT;
    num += dt * ((points[i] as { value: number }).value - meanV);
    den += dt * dt;
  }
  if (den === 0) return null;
  return num / den;
}

/**
 * Demand trajectory -- is interest growing or dying?
 *
 * Each series is normalised by its own mean before averaging, because the raw
 * units are incomparable: subreddit subscribers, npm downloads and posts per
 * month share no scale. What is comparable is fractional change.
 *
 * A missing series lowers confidence rather than skewing the score, which is
 * why `seriesCount` is reported separately instead of being folded in. This is
 * what keeps the fragile Google Trends adapter from ever being load-bearing.
 */
export function trajectorySignal(evidence: Evidence[], _now: Date): TrajectorySignal {
  const bySeries = new Map<string, { at: Date; value: number }[]>();
  for (const e of evidence) {
    if (e.kind !== "trend_point") continue;
    const points = bySeries.get(e.series) ?? [];
    points.push({ at: e.at, value: e.value });
    bySeries.set(e.series, points);
  }

  const slopes: number[] = [];
  for (const points of bySeries.values()) {
    points.sort((a, b) => a.at.getTime() - b.at.getTime());
    const perMonth = slopePerMonth(points);
    if (perMonth === null) continue;

    const mean = points.reduce((a, p) => a + p.value, 0) / points.length;
    if (mean === 0) continue;

    // Fractional change across the whole window, so 0.5 reads as "half again".
    slopes.push(clamp((perMonth * WINDOW_MONTHS) / mean, -1, 1));
  }

  if (slopes.length === 0) return { slope: 0, seriesCount: 0 };

  return {
    slope: clamp(slopes.reduce((a, b) => a + b, 0) / slopes.length, -1, 1),
    seriesCount: slopes.length,
  };
}
