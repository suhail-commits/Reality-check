import { beforeEach, describe, expect, it } from "vitest";
import { obituary, resetFixtureIds } from "../fixtures.js";
import { graveyardSignal } from "./graveyard.js";

const NOW = new Date("2026-01-01");
const RECENT = new Date("2024-06-01");
const ANCIENT = new Date("2009-01-01");

beforeEach(resetFixtureIds);

describe("graveyardSignal", () => {
  /**
   * The reading that would have killed Airbnb and Dropbox: startups died here,
   * therefore no. Execution failures say nothing about the market, and
   * acquisitions say something good, so a pile of both must not read as a wall.
   */
  it("treats execution failures plus acquisitions as an attractive market", () => {
    const s = graveyardSignal(
      [
        obituary("A", "execution", { diedAt: RECENT }),
        obituary("B", "execution", { diedAt: RECENT }),
        obituary("C", "founder_quit", { diedAt: RECENT }),
        obituary("D", "ran_out_of_runway", { diedAt: RECENT }),
        obituary("E", "execution", { diedAt: RECENT }),
        obituary("F", "acquired", { diedAt: RECENT }),
        obituary("G", "acquired", { diedAt: RECENT }),
      ],
      NOW,
    );
    expect(s.recentDemandSideDeaths).toBe(0);
    expect(s.acquisitions).toBe(2);
    expect(s.score).toBeGreaterThan(0);
  });

  it("counts two recent demand-side deaths as a wall", () => {
    const s = graveyardSignal(
      [
        obituary("A", "no_demand", { diedAt: RECENT }),
        obituary("B", "unit_economics", { diedAt: RECENT }),
      ],
      NOW,
    );
    expect(s.recentDemandSideDeaths).toBe(2);
    expect(s.score).toBeLessThan(0);
  });

  it("counts regulatory death as demand-side", () => {
    const s = graveyardSignal([obituary("A", "regulatory", { diedAt: RECENT })], NOW);
    expect(s.recentDemandSideDeaths).toBe(1);
  });

  it("does not count a death older than the recency window", () => {
    const s = graveyardSignal([obituary("A", "no_demand", { diedAt: ANCIENT })], NOW);
    expect(s.recentDemandSideDeaths).toBe(0);
    // It still weighs on the score, just far less than a recent one would.
    expect(s.score).toBeGreaterThan(
      graveyardSignal([obituary("A", "no_demand", { diedAt: RECENT })], NOW).score,
    );
  });

  it("scores a market with only acquisitions positively", () => {
    expect(graveyardSignal([obituary("A", "acquired", { diedAt: RECENT })], NOW).score)
      .toBeGreaterThan(0);
  });

  it("treats a pivot as a weaker negative than a demand-side death", () => {
    const pivot = graveyardSignal([obituary("A", "pivoted_away", { diedAt: RECENT })], NOW).score;
    const died = graveyardSignal([obituary("A", "no_demand", { diedAt: RECENT })], NOW).score;
    expect(pivot).toBeLessThan(0);
    expect(pivot).toBeGreaterThan(died);
  });

  it("is neutral on an empty graveyard", () => {
    expect(graveyardSignal([], NOW)).toEqual({
      score: 0,
      recentDemandSideDeaths: 0,
      acquisitions: 0,
    });
  });

  it("falls back to the posting date when no date of death is given", () => {
    const s = graveyardSignal([obituary("A", "no_demand", { postedAt: RECENT })], NOW);
    expect(s.recentDemandSideDeaths).toBe(1);
  });
});
