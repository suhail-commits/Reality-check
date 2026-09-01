import { describe, expect, it } from "vitest";
import { enforceCitations } from "./citations.js";

const REAL = new Set(["ev_001", "ev_002", "ev_003"]);

describe("enforceCitations", () => {
  it("keeps a sentence whose citation resolves", () => {
    const r = enforceCitations("Users hate the pricing [ev_001].", REAL);
    expect(r.text).toBe("Users hate the pricing [ev_001].");
    expect(r.citedIds).toEqual(["ev_001"]);
    expect(r.dropped).toEqual([]);
  });

  it("drops a sentence with no citation at all", () => {
    const r = enforceCitations("This market is clearly enormous.", REAL);
    expect(r.text).toBe("");
    expect(r.dropped).toEqual(["This market is clearly enormous."]);
  });

  /**
   * The most dangerous shape in the whole product: grounded sentences lending
   * their credibility to an invented one sitting between them.
   */
  it("removes an invented sentence from the middle of a grounded paragraph", () => {
    const r = enforceCitations(
      "Users hate the pricing [ev_001]. Gartner projects 40% annual growth. Support is slow [ev_002].",
      REAL,
    );
    expect(r.text).toBe("Users hate the pricing [ev_001]. Support is slow [ev_002].");
    expect(r.dropped).toEqual(["Gartner projects 40% annual growth."]);
  });

  /** A citation that points at nothing is worse than none: it looks like proof. */
  it("drops a sentence citing an evidence id that does not exist", () => {
    const r = enforceCitations("A competitor raised $40m last year [ev_999].", REAL);
    expect(r.text).toBe("");
    expect(r.citedIds).toEqual([]);
  });

  it("keeps a sentence if at least one of its citations resolves", () => {
    const r = enforceCitations("Two sources agree [ev_001] [ev_999].", REAL);
    expect(r.text).toContain("Two sources agree");
    expect(r.citedIds).toEqual(["ev_001"]);
  });

  /** Silent, not flagged. A marked claim is still a claim to a reader who cannot check it. */
  it("leaves no trace of what it removed", () => {
    const r = enforceCitations("Grounded [ev_001]. Invented nonsense. More grounded [ev_002].", REAL);
    expect(r.text).not.toMatch(/unverified|\[removed\]|\.\.\./i);
    expect(r.text).not.toContain("Invented");
  });

  it("does not split on common abbreviations", () => {
    const r = enforceCitations(
      "Several tools, e.g. Calendly and Cal.com, draw the same complaint [ev_001].",
      REAL,
    );
    expect(r.text).toBe(
      "Several tools, e.g. Calendly and Cal.com, draw the same complaint [ev_001].",
    );
  });

  it("reports each cited id once, in the order it first appears", () => {
    const r = enforceCitations(
      "A [ev_002]. B [ev_001]. C [ev_002]. D [ev_003].",
      REAL,
    );
    expect(r.citedIds).toEqual(["ev_002", "ev_001", "ev_003"]);
  });

  it("returns nothing rather than throwing when the whole answer is ungrounded", () => {
    const r = enforceCitations("Everything here was invented. None of it is real.", REAL);
    expect(r.text).toBe("");
    expect(r.dropped).toHaveLength(2);
  });

  it("handles empty prose", () => {
    expect(enforceCitations("", REAL)).toEqual({ text: "", citedIds: [], dropped: [] });
  });

  it("keeps questions and exclamations that are grounded", () => {
    const r = enforceCitations("Why is support still this slow [ev_001]?", REAL);
    expect(r.text).toBe("Why is support still this slow [ev_001]?");
  });
});
