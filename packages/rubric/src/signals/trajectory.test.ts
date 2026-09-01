import { beforeEach, describe, expect, it } from "vitest";
import { resetFixtureIds, trendPoint } from "../fixtures.js";
import { trajectorySignal } from "./trajectory.js";

const NOW = new Date("2026-01-01");

beforeEach(resetFixtureIds);

/** A monthly series of `values`, ending the month before `NOW`. */
function series(name: string, values: number[]) {
  return values.map((v, i) =>
    trendPoint(name, new Date(Date.UTC(2024, i + 1, 1)), v),
  );
}

describe("trajectorySignal", () => {
  it("is positive for a growing series", () => {
    const s = trajectorySignal(series("subs", [100, 120, 140, 160, 180]), NOW);
    expect(s.slope).toBeGreaterThan(0);
    expect(s.seriesCount).toBe(1);
  });

  it("is negative for a shrinking series", () => {
    expect(trajectorySignal(series("subs", [180, 160, 140, 120, 100]), NOW).slope).toBeLessThan(0);
  });

  it("is flat for a flat series", () => {
    expect(trajectorySignal(series("subs", [100, 100, 100, 100]), NOW).slope).toBeCloseTo(0, 5);
  });

  /**
   * Subscribers, downloads and posts-per-month share no scale, so the raw
   * slopes are incomparable. Normalising each series by its own mean is what
   * makes averaging them mean anything.
   */
  it("compares series with wildly different units on equal terms", () => {
    const small = trajectorySignal(series("subs", [10, 20, 30, 40]), NOW).slope;
    const large = trajectorySignal(series("dl", [1_000_000, 2_000_000, 3_000_000, 4_000_000]), NOW)
      .slope;
    expect(small).toBeCloseTo(large, 5);
  });

  /**
   * A missing series must lower confidence, never skew the score. This is what
   * stops the fragile Google Trends adapter from ever being load-bearing.
   */
  it("reports no series rather than a fabricated slope when there is no data", () => {
    expect(trajectorySignal([], NOW)).toEqual({ slope: 0, seriesCount: 0 });
  });

  it("ignores a series with a single point", () => {
    expect(trajectorySignal(series("subs", [100]), NOW).seriesCount).toBe(0);
  });

  it("averages across series, so one soaring source cannot carry a dying market", () => {
    const s = trajectorySignal(
      [...series("up", [10, 20, 30, 40]), ...series("down", [40, 30, 20, 10])],
      NOW,
    );
    expect(s.seriesCount).toBe(2);
    expect(s.slope).toBeCloseTo(0, 5);
  });

  it("clamps explosive growth to 1", () => {
    expect(trajectorySignal(series("subs", [1, 10, 100, 1000]), NOW).slope).toBeLessThanOrEqual(1);
  });

  it("is unaffected by the order points arrive in", () => {
    const ordered = series("subs", [100, 120, 140, 160]);
    const shuffled = [ordered[2]!, ordered[0]!, ordered[3]!, ordered[1]!];
    expect(trajectorySignal(shuffled, NOW).slope).toBeCloseTo(
      trajectorySignal(ordered, NOW).slope,
      10,
    );
  });
});
