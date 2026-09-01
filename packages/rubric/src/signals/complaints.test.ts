import { beforeEach, describe, expect, it } from "vitest";
import { complaint, praise, resetFixtureIds } from "../fixtures.js";
import { complaintSignal } from "./complaints.js";

const NOW = new Date("2026-01-01");
const RECENT = new Date("2025-11-01");

beforeEach(resetFixtureIds);

describe("complaintSignal", () => {
  it("is 1 when a competitor draws only complaints", () => {
    const s = complaintSignal(
      [complaint("calendly", { postedAt: RECENT }), complaint("calendly", { postedAt: RECENT })],
      NOW,
    );
    expect(s.ratio).toBe(1);
  });

  it("is 0 when a competitor draws only praise", () => {
    const s = complaintSignal(
      [praise("calendly", { postedAt: RECENT }), praise("calendly", { postedAt: RECENT })],
      NOW,
    );
    expect(s.ratio).toBe(0);
    expect(s.praiseVolume).toBeGreaterThan(0);
  });

  it("is 0 with no complaint or praise evidence at all", () => {
    expect(complaintSignal([], NOW).ratio).toBe(0);
  });

  /**
   * The distinction the whole design turns on. No complaints because users are
   * happy is a completely different market from no complaints because we found
   * nothing, but the ratio alone reads identically for both. praiseVolume is
   * the field that separates them, and rule 4 is required to consult it.
   */
  it("gives an empty gather and a happy market the same ratio but different praise volume", () => {
    const empty = complaintSignal([], NOW);
    const happy = complaintSignal(
      [praise("a", { postedAt: RECENT }), praise("a", { postedAt: RECENT }), praise("b", { postedAt: RECENT })],
      NOW,
    );
    expect(empty.ratio).toBe(happy.ratio);
    expect(empty.praiseVolume).toBe(0);
    expect(happy.praiseVolume).toBeGreaterThan(0);
  });

  it("weights a competitor's ratio by how much was said about it", () => {
    // The loud product is mostly liked; the quiet one is entirely disliked.
    const s = complaintSignal(
      [
        praise("loud", { postedAt: RECENT }),
        praise("loud", { postedAt: RECENT }),
        praise("loud", { postedAt: RECENT }),
        complaint("loud", { postedAt: RECENT }),
        complaint("quiet", { postedAt: RECENT }),
      ],
      NOW,
    );
    // An unweighted mean of per-competitor ratios would be (0.25 + 1) / 2 = 0.625.
    expect(s.ratio).toBeLessThan(0.5);
  });

  it("boosts a theme recurring across competitors over one confined to a single product", () => {
    const spread = complaintSignal(
      [
        complaint("a", { theme: "timezones", postedAt: RECENT }),
        complaint("b", { theme: "timezones", postedAt: RECENT }),
        praise("a", { postedAt: RECENT }),
        praise("b", { postedAt: RECENT }),
      ],
      NOW,
    );
    const confined = complaintSignal(
      [
        complaint("a", { theme: "timezones", postedAt: RECENT }),
        complaint("a", { theme: "timezones", postedAt: RECENT }),
        praise("a", { postedAt: RECENT }),
        praise("b", { postedAt: RECENT }),
      ],
      NOW,
    );
    expect(spread.recurringThemes).toEqual(["timezones"]);
    expect(confined.recurringThemes).toEqual([]);
    expect(spread.ratio).toBeGreaterThan(confined.ratio);
  });

  it("decays a six-year-old grievance against fresh praise", () => {
    const stale = complaintSignal(
      [complaint("a", { postedAt: new Date("2020-01-01") }), praise("a", { postedAt: RECENT })],
      NOW,
    );
    expect(stale.ratio).toBeLessThan(0.5);
  });

  it("orders themes by weight, heaviest first", () => {
    const s = complaintSignal(
      [
        complaint("a", { theme: "pricing", postedAt: RECENT }),
        complaint("a", { theme: "pricing", postedAt: RECENT }),
        complaint("a", { theme: "ui", postedAt: RECENT }),
      ],
      NOW,
    );
    expect(s.topThemes[0]).toBe("pricing");
  });

  it("ranks a review-site complaint above a search snippet", () => {
    const review = complaintSignal(
      [complaint("a", { source: "appstore", postedAt: RECENT })],
      NOW,
    );
    const snippet = complaintSignal([complaint("a", { source: "search", postedAt: RECENT })], NOW);
    expect(review.complaintVolume).toBeGreaterThan(snippet.complaintVolume);
  });

  it("treats undated evidence as one half-life old rather than discarding it", () => {
    const undated = complaintSignal([complaint("a")], NOW);
    expect(undated.complaintVolume).toBeGreaterThan(0);
    expect(undated.complaintVolume).toBeLessThan(
      complaintSignal([complaint("a", { postedAt: NOW })], NOW).complaintVolume,
    );
  });
});
