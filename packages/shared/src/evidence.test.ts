import { describe, expect, it } from "vitest";
import { Evidence } from "./evidence.js";

const base = {
  id: "e1",
  source: "hn" as const,
  url: "https://news.ycombinator.com/item?id=1",
  quote: "Calendly's timezone handling breaks every DST change.",
  retrievedAt: new Date("2026-01-01"),
};

describe("Evidence", () => {
  /**
   * The schema-level half of "no citation, no claim". If a row without a
   * resolvable URL could be constructed, an uncited claim would have somewhere
   * to come from.
   */
  it("rejects a row with no URL", () => {
    const { url: _omitted, ...noUrl } = base;
    expect(Evidence.safeParse({ ...noUrl, kind: "barrier", barrier: "data_moat" }).success).toBe(
      false,
    );
  });

  it("rejects a row whose URL is not a URL", () => {
    const row = { ...base, url: "probably a blog post somewhere", kind: "barrier", barrier: "data_moat" };
    expect(Evidence.safeParse(row).success).toBe(false);
  });

  it("rejects a row with an empty quote", () => {
    const row = { ...base, quote: "", kind: "barrier", barrier: "data_moat" };
    expect(Evidence.safeParse(row).success).toBe(false);
  });

  /**
   * The complaint ratio is computed per competitor. Unattributed complaints
   * would silently fall back to a denominator of "whatever the query returned".
   */
  it("requires complaints to name the competitor they are about", () => {
    expect(Evidence.safeParse({ ...base, kind: "complaint" }).success).toBe(false);
    expect(
      Evidence.safeParse({ ...base, kind: "complaint", competitorId: "calendly" }).success,
    ).toBe(true);
  });

  it("requires praise to name the competitor it is about", () => {
    expect(Evidence.safeParse({ ...base, kind: "praise" }).success).toBe(false);
    expect(Evidence.safeParse({ ...base, kind: "praise", competitorId: "calendly" }).success).toBe(
      true,
    );
  });

  /** Praise is first-class, not an afterthought: it is the ratio's denominator. */
  it("accepts praise as an evidence kind in its own right", () => {
    const parsed = Evidence.parse({ ...base, kind: "praise", competitorId: "calendly" });
    expect(parsed.kind).toBe("praise");
  });

  it("requires an obituary to carry a classified cause of death", () => {
    expect(Evidence.safeParse({ ...base, kind: "obituary", name: "Sunrise" }).success).toBe(false);
    expect(
      Evidence.safeParse({ ...base, kind: "obituary", name: "Sunrise", causeOfDeath: "acquired" })
        .success,
    ).toBe(true);
  });

  it("rejects a cause of death outside the closed enum", () => {
    const row = { ...base, kind: "obituary", name: "Sunrise", causeOfDeath: "vibes" };
    expect(Evidence.safeParse(row).success).toBe(false);
  });

  it("rejects an unknown evidence kind", () => {
    expect(Evidence.safeParse({ ...base, kind: "vibe_check" }).success).toBe(false);
  });
});
