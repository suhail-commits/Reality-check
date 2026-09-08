import { beforeEach, describe, expect, it } from "vitest";
import { competitor, complaint, obituary, resetFixtureIds } from "./fixtures.js";
import { chooseRedirect } from "./redirect.js";

const NOW = new Date("2026-01-01");
const RECENT = new Date("2025-11-01");

const COMPETITORS = [competitor("rover", "Rover"), competitor("wag", "Wag")];

/** `n` complaints about one product, all on the same theme. */
function cluster(competitorId: string, theme: string, n: number) {
  return Array.from({ length: n }, () => complaint(competitorId, { theme, postedAt: RECENT }));
}

beforeEach(resetFixtureIds);

describe("chooseRedirect", () => {
  /**
   * A complaint that follows users from one product to the next is not one bad
   * company. None of them closed it, which is what makes it an opening.
   */
  it("calls a complaint spanning two products with enough sources strong", () => {
    const r = chooseRedirect(
      [...cluster("rover", "vetting", 2), ...cluster("wag", "vetting", 2)],
      COMPETITORS,
      undefined,
      NOW,
    );
    expect(r?.strength).toBe("strong");
    expect(r?.theme).toBe("vetting");
    expect(r?.competitorIds).toEqual(["rover", "wag"]);
    expect(r?.basis).toContain("Rover and Wag");
  });

  it("calls a complaint about a single product thin, and still reports it", () => {
    const r = chooseRedirect(cluster("rover", "vetting", 4), COMPETITORS, undefined, NOW);
    expect(r?.strength).toBe("thin");
    expect(r?.theme).toBe("vetting");
  });

  it("calls a widely spread but barely mentioned complaint thin", () => {
    const r = chooseRedirect(
      [...cluster("rover", "vetting", 1), ...cluster("wag", "vetting", 1)],
      COMPETITORS,
      undefined,
      NOW,
    );
    expect(r?.strength).toBe("thin");
  });

  /**
   * A tool that answers "your idea is good, go do your idea" is worth nothing.
   * The point is to find the thing they have not thought of.
   */
  it("never recommends the thing the user already said they would fix", () => {
    const evidence = [
      ...cluster("rover", "scheduling is clunky", 4),
      ...cluster("wag", "scheduling is clunky", 4),
      ...cluster("rover", "vetting is shallow", 2),
    ];
    const r = chooseRedirect(evidence, COMPETITORS, "better scheduling for owners", NOW);
    expect(r?.theme).toBe("vetting is shallow");
  });

  /**
   * Regression. The stated angle used to be filtered out unconditionally, so a
   * market whose only complaint was the thing the founder already planned to fix
   * produced no redirect at all. Exposed by Dropbox 2007 in the eval harness:
   * the sole grievance was that sync broke, and the whole plan was sync that
   * works. Going silent there is worse than confirming it.
   */
  it("confirms the user's own angle when it is the only complaint in the market", () => {
    const r = chooseRedirect(
      [...cluster("foldershare", "sync silently breaks", 3)],
      [competitor("foldershare", "FolderShare")],
      "sync that works without the user thinking about it",
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r?.theme).toBe("sync silently breaks");
    expect(r?.basis).toContain("aiming at the right thing");
  });

  it("picks the heaviest cluster, not the first one seen", () => {
    const r = chooseRedirect(
      [...cluster("rover", "minor gripe", 1), ...cluster("rover", "the real problem", 5)],
      COMPETITORS,
      undefined,
      NOW,
    );
    expect(r?.theme).toBe("the real problem");
  });

  it("prefers a fresh complaint over a stale one of the same size", () => {
    const stale = complaint("rover", { theme: "old news", postedAt: new Date("2019-01-01") });
    const r = chooseRedirect(
      [stale, complaint("rover", { theme: "current", postedAt: RECENT })],
      COMPETITORS,
      undefined,
      NOW,
    );
    expect(r?.theme).toBe("current");
  });

  describe("when nobody is complaining", () => {
    const dead = [obituary("Kozmo", "no_demand", { diedAt: new Date("2024-01-01") })];

    /**
     * The product promises to show an opening. With no complaints there is no
     * gap to point at, so it reads the graveyard instead -- and says out loud
     * that it is reading rather than observing.
     */
    it("falls back to the graveyard and marks the reading speculative", () => {
      const r = chooseRedirect(dead, COMPETITORS, undefined, NOW);
      expect(r?.strength).toBe("speculative");
      expect(r?.basis).toContain("our reading, not the market's");
      expect(r?.theme).toContain("Kozmo");
    });

    it("prefers a death with a known cause over one without", () => {
      const r = chooseRedirect(
        [obituary("Vague", "unknown"), obituary("Informative", "unit_economics")],
        COMPETITORS,
        undefined,
        NOW,
      );
      expect(r?.theme).toContain("Informative");
    });

    it("returns nothing at all when there is nothing to point at", () => {
      expect(chooseRedirect([], COMPETITORS, undefined, NOW)).toBeNull();
    });
  });

  /**
   * The guarantee the whole promise rests on. Strength grades how confident the
   * inference is; it never grades whether a source exists. A redirect without a
   * citation would undo the citation pass and the quote check in one field.
   */
  it("cites at least one real piece of evidence at every strength", () => {
    const cases = [
      [...cluster("rover", "vetting", 2), ...cluster("wag", "vetting", 2)],
      cluster("rover", "vetting", 1),
      [obituary("Kozmo", "no_demand")],
    ];

    for (const evidence of cases) {
      const r = chooseRedirect(evidence, COMPETITORS, undefined, NOW);
      expect(r).not.toBeNull();
      expect(r!.evidenceIds.length).toBeGreaterThan(0);

      const real = new Set(evidence.map((e) => e.id));
      for (const id of r!.evidenceIds) expect(real.has(id)).toBe(true);
    }
  });

  it("ignores complaints with no theme, since there is nothing to name", () => {
    const r = chooseRedirect(
      [complaint("rover", { postedAt: RECENT }), ...cluster("wag", "named problem", 1)],
      COMPETITORS,
      undefined,
      NOW,
    );
    expect(r?.theme).toBe("named problem");
  });

  it("is deterministic", () => {
    const evidence = [...cluster("rover", "vetting", 2), ...cluster("wag", "vetting", 2)];
    expect(chooseRedirect(evidence, COMPETITORS, undefined, NOW)).toEqual(
      chooseRedirect(evidence, COMPETITORS, undefined, NOW),
    );
  });
});
