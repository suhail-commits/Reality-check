import type { Evidence } from "@rc/shared";
import { beforeEach, describe, expect, it } from "vitest";
import {
  competitor,
  competitorRow,
  obituary,
  resetFixtureIds,
  talk,
  trendPoint,
} from "./fixtures.js";
import { judge } from "./judge.js";
import type { RubricInput } from "./types.js";

const NOW = new Date("2026-01-01");

beforeEach(resetFixtureIds);

function input(over: Partial<RubricInput>): RubricInput {
  return {
    evidence: [],
    competitors: [],
    marketShape: "single_player_saas",
    adapterStatuses: { hn: "ok", github: "ok" },
    now: NOW,
    ...over,
  };
}

function growing(name: string) {
  return [100, 130, 160, 200, 240].map((v, i) =>
    trendPoint(name, new Date(Date.UTC(2024, i + 1, 1)), v),
  );
}

describe("judge", () => {
  /**
   * THE assertion this project turns on.
   *
   * Both markets produced exactly three complaints. One is a market where users
   * are demonstrably happy; the other is a run where the gather came back
   * nearly empty. A rubric that reads only the complaint ratio calls both of
   * them DON'T BUILD IT -- reporting our own retrieval failure to the user as a
   * confident verdict about their idea.
   *
   * If these two ever return the same verdict again, the praise signal has been
   * lost somewhere and the harshest thing this tool can say has become a lie.
   */
  describe("contentment is not the same as finding nothing", () => {
    const THREE_COMPLAINTS = 3;

    const thinGather = input({
      evidence: [
        ...talk("a", { complaints: THREE_COMPLAINTS }, NOW),
        competitorRow("a", "Alpha"),
        competitorRow("b", "Beta"),
      ],
      competitors: [competitor("a"), competitor("b"), competitor("c")],
    });

    const happyMarket = input({
      evidence: [
        ...talk("a", { complaints: THREE_COMPLAINTS }, NOW),
        ...talk("a", { praise: 12 }, NOW),
        ...talk("b", { praise: 12 }, NOW),
        ...talk("c", { praise: 10 }, NOW),
        competitorRow("a", "Alpha"),
        competitorRow("b", "Beta"),
        competitorRow("c", "Gamma"),
      ],
      competitors: [competitor("a"), competitor("b"), competitor("c")],
    });

    it("both markets produced the same number of complaints", () => {
      const count = (e: Evidence[]) => e.filter((x) => x.kind === "complaint").length;
      expect(count(thinGather.evidence)).toBe(count(happyMarket.evidence));
    });

    it("a thin gather admits it does not know", () => {
      const r = judge(thinGather);
      expect(r.verdict).toBe("GO_FIND_OUT");
      expect(r.firedRule).toBe(1);
    });

    it("an observably happy market gets the honest no", () => {
      const r = judge(happyMarket);
      expect(r.verdict).toBe("DONT_BUILD_IT");
      expect(r.firedRule).toBe(4);
    });

    it("the two do not collapse into the same verdict", () => {
      expect(judge(thinGather).verdict).not.toBe(judge(happyMarket).verdict);
    });
  });

  it("says build it when users are angry and the wedge lands on why", () => {
    const r = judge(
      input({
        evidence: [
          ...talk("a", { complaints: 10, theme: "timezone handling" }, NOW),
          ...talk("b", { complaints: 10, theme: "timezone handling" }, NOW),
          ...talk("a", { praise: 3 }, NOW),
          ...growing("subreddit"),
          competitorRow("a", "Alpha"),
          competitorRow("b", "Beta"),
        ],
        competitors: [competitor("a"), competitor("b"), competitor("c"), competitor("d")],
        statedWedge: "get timezone handling right",
      }),
    );
    expect(r.verdict).toBe("BUILD_IT");
    expect(r.firedRule).toBe(6);
  });

  it("says build it differently when the wedge misses what users complain about", () => {
    const r = judge(
      input({
        evidence: [
          ...talk("a", { complaints: 10, theme: "timezone handling" }, NOW),
          ...talk("b", { complaints: 10, theme: "timezone handling" }, NOW),
          ...talk("a", { praise: 3 }, NOW),
          ...growing("subreddit"),
          competitorRow("a", "Alpha"),
        ],
        competitors: [competitor("a"), competitor("b"), competitor("c")],
        statedWedge: "a nicer dashboard with prettier charts",
      }),
    );
    expect(r.verdict).toBe("BUILD_IT_DIFFERENTLY");
    expect(r.firedRule).toBe(6);
  });

  /** R1 in its sharpest form: a crowded, furious market is an open market. */
  it("does not say no just because competitors exist", () => {
    const r = judge(
      input({
        evidence: [
          ...talk("a", { complaints: 8, theme: "sync" }, NOW),
          ...talk("b", { complaints: 8, theme: "sync" }, NOW),
          ...talk("c", { complaints: 8, theme: "sync" }, NOW),
          ...growing("posts"),
          competitorRow("a", "Alpha"),
        ],
        competitors: [
          competitor("a"),
          competitor("b"),
          competitor("c"),
          competitor("d"),
          competitor("e"),
        ],
        statedWedge: "sync that works",
      }),
    );
    expect(r.verdict).toBe("BUILD_IT");
  });

  it("says no to a market with two recent demand-side deaths", () => {
    const r = judge(
      input({
        evidence: [
          ...talk("a", { complaints: 6, theme: "price" }, NOW),
          ...talk("a", { praise: 4 }, NOW),
          obituary("Alpha", "no_demand", { diedAt: new Date("2024-03-01") }),
          obituary("Beta", "unit_economics", { diedAt: new Date("2024-09-01") }),
          competitorRow("c", "Gamma"),
        ],
        competitors: [competitor("c")],
      }),
    );
    expect(r.verdict).toBe("DONT_BUILD_IT");
    expect(r.firedRule).toBe(3);
    expect(r.scores.recentDemandSideDeaths).toBe(2);
  });

  it("redirects rather than refusing when the market shape raises the barriers", () => {
    const r = judge(
      input({
        evidence: [
          ...talk("a", { complaints: 12, theme: "matching" }, NOW),
          ...talk("a", { praise: 2 }, NOW),
          competitorRow("a", "Alpha"),
        ],
        competitors: [competitor("a")],
        marketShape: "hardware",
        statedWedge: "better matching",
      }),
    );
    expect(r.scores.feasibility).toBeLessThan(100);
  });

  describe("confidence", () => {
    const evidence = [
      ...talk("a", { complaints: 6, theme: "sync", source: "hn" }, NOW),
      ...talk("a", { praise: 6, source: "hn" }, NOW),
      competitorRow("a", "Alpha"),
    ];

    it("cannot reach high when half the adapters dropped out", () => {
      const r = judge(input({ evidence, adapterStatuses: { hn: "ok", github: "failed" } }));
      expect(r.confidence.band).not.toBe("high");
      expect(r.confidence.adaptersReturned).toBe(1);
      expect(r.confidence.adaptersAttempted).toBe(2);
    });

    /** A timeout is an ordinary degradation, treated exactly like a failure. */
    it("treats a timed-out adapter the same as a failed one", () => {
      const timedOut = judge(input({ evidence, adapterStatuses: { hn: "ok", github: "timed_out" } }));
      const failed = judge(input({ evidence, adapterStatuses: { hn: "ok", github: "failed" } }));
      expect(timedOut.confidence.band).toBe(failed.confidence.band);
      expect(timedOut.confidence.adaptersReturned).toBe(failed.confidence.adaptersReturned);
    });

    /** A skipped adapter was never attempted, so it should not count against us. */
    it("does not penalise an adapter that was skipped for want of a key", () => {
      const r = judge(input({ evidence, adapterStatuses: { hn: "ok", reddit: "skipped" } }));
      expect(r.confidence.adaptersAttempted).toBe(1);
      expect(r.confidence.adaptersReturned).toBe(1);
    });

    it("degrading a source never changes the verdict, only the confidence", () => {
      const clean = judge(input({ evidence, adapterStatuses: { hn: "ok", github: "ok" } }));
      const degraded = judge(input({ evidence, adapterStatuses: { hn: "ok", github: "timed_out" } }));
      expect(degraded.verdict).toBe(clean.verdict);
    });
  });

  it("is deterministic for the same evidence", () => {
    const i = input({
      evidence: [...talk("a", { complaints: 5, theme: "sync" }, NOW), competitorRow("a", "Alpha")],
      competitors: [competitor("a")],
    });
    expect(judge(i)).toEqual(judge(i));
  });

  it("lets the engine override the wedge match with a semantic answer", () => {
    const base = {
      evidence: [
        ...talk("a", { complaints: 10, theme: "timezone handling" }, NOW),
        ...talk("b", { complaints: 10, theme: "timezone handling" }, NOW),
        ...talk("a", { praise: 3 }, NOW),
        ...growing("subreddit"),
        competitorRow("a", "Alpha"),
      ],
      competitors: [competitor("a"), competitor("b"), competitor("c")],
      statedWedge: "handle daylight saving properly",
    };
    // Lexically these share no words, so the rubric's own answer is "no match".
    expect(judge(input(base)).verdict).toBe("BUILD_IT_DIFFERENTLY");
    expect(judge({ ...input(base), wedgeMatchesTopCluster: true }).verdict).toBe("BUILD_IT");
  });
});
