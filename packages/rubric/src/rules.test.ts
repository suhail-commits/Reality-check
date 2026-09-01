import type { Scores } from "@rc/shared";
import { describe, expect, it } from "vitest";
import {
  COMPLAINT_RATIO_HIGH,
  COMPLAINT_RATIO_LOW,
  FEASIBILITY_ABSOLUTE,
  FEASIBILITY_FLOOR,
  MIN_EVIDENCE,
  MIN_PRAISE,
} from "./constants.js";
import { decide } from "./rules.js";

/** A market that trips no rule on its own; each test perturbs one dimension. */
const neutral: Scores = {
  complaintRatio: 0.4,
  praiseVolume: 10,
  evidenceVolume: 40,
  graveyard: 0,
  trajectory: 0.1,
  feasibility: 80,
  competitorCount: 4,
  recentDemandSideDeaths: 0,
  demandSignal: 30,
  wedgeMatchesTopCluster: false,
};

const s = (over: Partial<Scores>): Scores => ({ ...neutral, ...over });

describe("rule 1 - too little evidence", () => {
  it("says GO FIND OUT rather than bluffing a verdict", () => {
    const d = decide(s({ evidenceVolume: MIN_EVIDENCE - 1 }));
    expect(d).toMatchObject({ verdict: "GO_FIND_OUT", firedRule: 1 });
  });

  it("outranks every other rule, including a wall of deaths", () => {
    const d = decide(s({ evidenceVolume: 2, recentDemandSideDeaths: 5 }));
    expect(d.firedRule).toBe(1);
  });
});

describe("rule 2 - the empty market", () => {
  /** R2: "nothing like this exists" is a red flag, not a green light. */
  it("says no when nobody built it and nobody is asking", () => {
    const d = decide(s({ competitorCount: 0, demandSignal: 0 }));
    expect(d).toMatchObject({ verdict: "DONT_BUILD_IT", firedRule: 2 });
  });

  it("does not fire when nobody built it but people are asking loudly", () => {
    const d = decide(s({ competitorCount: 0, demandSignal: 30 }));
    expect(d.firedRule).not.toBe(2);
  });
});

describe("rule 3 - the graveyard", () => {
  it("says no to two recent demand-side deaths", () => {
    const d = decide(s({ recentDemandSideDeaths: 2 }));
    expect(d).toMatchObject({ verdict: "DONT_BUILD_IT", firedRule: 3 });
  });

  it("ignores a single death", () => {
    expect(decide(s({ recentDemandSideDeaths: 1 })).firedRule).not.toBe(3);
  });
});

describe("rule 4 - contentment", () => {
  const content = {
    competitorCount: 4,
    complaintRatio: COMPLAINT_RATIO_LOW - 0.05,
    praiseVolume: MIN_PRAISE + 5,
    trajectory: -0.1,
  };

  it("says no when several products serve a flat market and users are happy", () => {
    const d = decide(s(content));
    expect(d).toMatchObject({ verdict: "DONT_BUILD_IT", firedRule: 4 });
  });

  /**
   * The bug this whole design exists to prevent. Silence and contentment
   * produce the same complaint ratio; only observed praise separates them, and
   * a thin gather must never be reported back as a happy market.
   */
  it("does NOT fire when the low ratio comes from finding nothing at all", () => {
    const d = decide(s({ ...content, praiseVolume: 0 }));
    expect(d.verdict).not.toBe("DONT_BUILD_IT");
    expect(d.firedRule).not.toBe(4);
  });

  it("does not fire when the market is growing despite happy users", () => {
    expect(decide(s({ ...content, trajectory: 0.5 })).firedRule).not.toBe(4);
  });

  /** R1: competitors existing is not itself a reason to say no. */
  it("does not fire on a crowded market whose users are furious", () => {
    const d = decide(s({ ...content, complaintRatio: 0.9 }));
    expect(d.verdict).not.toBe("DONT_BUILD_IT");
  });

  it("needs at least three competitors before contentment means anything", () => {
    expect(decide(s({ ...content, competitorCount: 2 })).firedRule).not.toBe(4);
  });
});

describe("rule 5 - feasibility", () => {
  it("redirects rather than refusing when barriers are steep", () => {
    const d = decide(s({ feasibility: FEASIBILITY_FLOOR - 1 }));
    expect(d).toMatchObject({ verdict: "BUILD_IT_DIFFERENTLY", firedRule: 5 });
  });

  it("refuses when barriers are absolute", () => {
    const d = decide(s({ feasibility: FEASIBILITY_ABSOLUTE - 1 }));
    expect(d).toMatchObject({ verdict: "DONT_BUILD_IT", firedRule: 5 });
  });
});

describe("rule 6 - the opening", () => {
  const opening = {
    complaintRatio: COMPLAINT_RATIO_HIGH + 0.1,
    trajectory: 0.3,
    feasibility: 80,
  };

  it("says build it when the wedge lands on what users complain about", () => {
    const d = decide(s({ ...opening, wedgeMatchesTopCluster: true }));
    expect(d).toMatchObject({ verdict: "BUILD_IT", firedRule: 6 });
  });

  it("says build it differently when the wedge misses the complaints", () => {
    const d = decide(s({ ...opening, wedgeMatchesTopCluster: false }));
    expect(d).toMatchObject({ verdict: "BUILD_IT_DIFFERENTLY", firedRule: 6 });
  });

  it("does not fire in a shrinking market, however angry the users", () => {
    expect(decide(s({ ...opening, trajectory: -0.5 })).firedRule).not.toBe(6);
  });
});

describe("rule 7 - the default", () => {
  it("says GO FIND OUT when the evidence is real but points nowhere", () => {
    const d = decide(neutral);
    expect(d).toMatchObject({ verdict: "GO_FIND_OUT", firedRule: 7 });
  });
});

describe("the rules table as a whole", () => {
  it("always names exactly one rule between 1 and 7", () => {
    const cases: Partial<Scores>[] = [
      { evidenceVolume: 1 },
      { competitorCount: 0, demandSignal: 0 },
      { recentDemandSideDeaths: 3 },
      { complaintRatio: 0.1, praiseVolume: 20, trajectory: -0.2 },
      { feasibility: 5 },
      { complaintRatio: 0.9, wedgeMatchesTopCluster: true },
      {},
    ];
    for (const c of cases) {
      const d = decide(s(c));
      expect(d.firedRule).toBeGreaterThanOrEqual(1);
      expect(d.firedRule).toBeLessThanOrEqual(7);
      expect(d.reason.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    expect(decide(neutral)).toEqual(decide(neutral));
  });
});
