import { beforeEach, describe, expect, it } from "vitest";
import { barrier, resetFixtureIds } from "../fixtures.js";
import { FEASIBILITY_FLOOR } from "../constants.js";
import { feasibilitySignal } from "./feasibility.js";

beforeEach(resetFixtureIds);

describe("feasibilitySignal", () => {
  it("is 100 for a single-player SaaS with nothing cited against it", () => {
    const s = feasibilitySignal([], "single_player_saas");
    expect(s.score).toBe(100);
    expect(s.barriers).toEqual([]);
  });

  /**
   * Nobody writes a blog post saying marketplaces need both sides, so this
   * barrier can never arrive as cited evidence. Without the structural table
   * the rubric would happily tell a solo founder to go build Uber.
   */
  it("applies network effects to a marketplace with no evidence at all", () => {
    const s = feasibilitySignal([], "two_sided_marketplace");
    expect(s.structural).toEqual(["network_effects"]);
    expect(s.score).toBeLessThan(100);
  });

  it("applies capital intensity to hardware and regulatory burden to a regulated service", () => {
    expect(feasibilitySignal([], "hardware").barriers).toEqual(["capital_intensity"]);
    expect(feasibilitySignal([], "regulated_service").barriers).toEqual(["regulatory_burden"]);
  });

  it("counts a cited barrier the model quoted rather than scored", () => {
    const s = feasibilitySignal([barrier("data_moat")], "single_player_saas");
    expect(s.observed).toEqual(["data_moat"]);
    expect(s.score).toBeLessThan(100);
  });

  it("does not double-count a barrier that is both cited and structural", () => {
    const cited = feasibilitySignal([barrier("network_effects")], "two_sided_marketplace");
    const structuralOnly = feasibilitySignal([], "two_sided_marketplace");
    expect(cited.barriers).toEqual(["network_effects"]);
    expect(cited.score).toBe(structuralOnly.score);
  });

  it("does not double-count the same barrier cited twice", () => {
    const once = feasibilitySignal([barrier("data_moat")], "unknown");
    const twice = feasibilitySignal([barrier("data_moat"), barrier("data_moat")], "unknown");
    expect(twice.score).toBe(once.score);
  });

  /** The case this signal exists to catch: do not tell someone to go build a bank. */
  it("puts a regulated, capital-heavy, locked-in market below the floor", () => {
    const s = feasibilitySignal(
      [
        barrier("regulatory_burden"),
        barrier("capital_intensity"),
        barrier("switching_costs"),
        barrier("distribution_lock"),
      ],
      "regulated_service",
    );
    expect(s.score).toBeLessThan(FEASIBILITY_FLOOR);
  });

  it("never goes below 0 even with every barrier stacked", () => {
    const s = feasibilitySignal(
      [
        barrier("regulatory_burden"),
        barrier("capital_intensity"),
        barrier("network_effects"),
        barrier("data_moat"),
        barrier("distribution_lock"),
        barrier("switching_costs"),
      ],
      "hardware",
    );
    expect(s.score).toBe(0);
  });
});
