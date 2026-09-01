import { describe, expect, it } from "vitest";
import { Scores, Verdict } from "./verdict.js";

const scores = {
  complaintRatio: 0.7,
  praiseVolume: 3,
  evidenceVolume: 40,
  graveyard: -10,
  trajectory: 0.2,
  feasibility: 72,
  competitorCount: 4,
  recentDemandSideDeaths: 0,
  demandSignal: 25,
  wedgeMatchesTopCluster: false,
};

describe("Verdict", () => {
  it("has exactly four outcomes", () => {
    expect(Verdict.options).toEqual([
      "BUILD_IT",
      "BUILD_IT_DIFFERENTLY",
      "DONT_BUILD_IT",
      "GO_FIND_OUT",
    ]);
  });
});

describe("Scores", () => {
  it("accepts a well-formed set", () => {
    expect(Scores.parse(scores)).toMatchObject({ complaintRatio: 0.7 });
  });

  it("rejects a complaint ratio outside 0..1", () => {
    expect(Scores.safeParse({ ...scores, complaintRatio: 1.2 }).success).toBe(false);
  });

  /** Shrinking markets are the fatal case; the slope has to be able to go negative. */
  it("allows a negative trajectory", () => {
    expect(Scores.parse({ ...scores, trajectory: -0.8 }).trajectory).toBe(-0.8);
  });

  /**
   * praiseVolume is what separates "users are content" from "our gather found
   * nothing". If it were ever optional, rule 4 would fire on absence again.
   */
  it("requires praiseVolume to be present", () => {
    const { praiseVolume: _omitted, ...without } = scores;
    expect(Scores.safeParse(without).success).toBe(false);
  });

  /**
   * Rule 3 reads this count rather than the aggregate graveyard score, because
   * two demand-side deaths are a wall however many acquisitions offset them.
   */
  it("requires the demand-side death count to be present", () => {
    const { recentDemandSideDeaths: _omitted, ...without } = scores;
    expect(Scores.safeParse(without).success).toBe(false);
  });

  /** The only score personal to the user rather than to the market. */
  it("requires the wedge match to be present", () => {
    const { wedgeMatchesTopCluster: _omitted, ...without } = scores;
    expect(Scores.safeParse(without).success).toBe(false);
  });
});
