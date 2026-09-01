import { beforeEach, describe, expect, it } from "vitest";
import { resetFixtureIds } from "../fixtures.js";
import { judge } from "../judge.js";
import { CASES } from "./cases.js";

/**
 * The eval harness.
 *
 * Unit tests prove each rule behaves as written. This proves the rules, taken
 * together with the constants, produce the right answer about markets whose
 * outcomes we already know. It is the only thing that can calibrate
 * MIN_EVIDENCE, MIN_PRAISE and FEASIBILITY_FLOOR -- without it the rubric is
 * reproducible but uncalibrated, which is a different and lesser claim.
 *
 * When a case fails, the fix is usually a constant, not a rule. Read the
 * `outcome` line first: it says what actually happened, so a failure can be
 * argued with rather than merely silenced.
 */
beforeEach(resetFixtureIds);

describe("historical cases", () => {
  for (const c of CASES) {
    it(`${c.name}: ${c.outcome}`, () => {
      const result = judge(c.input);

      if (c.expect) {
        expect(
          result.verdict,
          `expected ${c.expect}, got ${result.verdict} from rule ${result.firedRule} (${result.reason})`,
        ).toBe(c.expect);
      }

      for (const rejected of c.reject ?? []) {
        expect(
          result.verdict,
          `must never return ${rejected}; rule ${result.firedRule} said: ${result.reason}`,
        ).not.toBe(rejected);
      }
    });
  }
});

describe("the corpus as a whole", () => {
  const results = () => CASES.map((c) => ({ case: c, result: judge(c.input) }));

  /**
   * A tool that never says no is a tool nobody needs, and one that always says
   * no is worse. If the corpus ever collapses onto a single verdict, the rubric
   * has stopped discriminating and the unit tests will not notice.
   */
  it("produces a spread of verdicts, not one answer for everything", () => {
    const distinct = new Set(results().map((r) => r.result.verdict));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });

  it("never lets a single rule decide more than half the corpus", () => {
    const counts = new Map<number, number>();
    for (const { result } of results()) {
      counts.set(result.firedRule, (counts.get(result.firedRule) ?? 0) + 1);
    }
    const worst = Math.max(...counts.values());
    expect(worst).toBeLessThanOrEqual(Math.ceil(CASES.length / 2));
  });

  /** The headline claim. If any of these three fails, the project is not credible. */
  it("does not tell Airbnb, Dropbox or Slack no", () => {
    const founders = ["Airbnb, 2008", "Dropbox, 2007", "Slack, 2013"];
    for (const name of founders) {
      const c = CASES.find((x) => x.name === name);
      expect(c, `missing case: ${name}`).toBeDefined();
      expect(judge(c!.input).verdict).not.toBe("DONT_BUILD_IT");
    }
  });

  it("is deterministic across a full second pass", () => {
    const first = results().map((r) => `${r.case.name}:${r.result.verdict}:${r.result.firedRule}`);
    const second = results().map((r) => `${r.case.name}:${r.result.verdict}:${r.result.firedRule}`);
    expect(second).toEqual(first);
  });
});
