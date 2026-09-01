import type { RawItem } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { FakeModel } from "../model.js";
import { extract, quoteAppearsIn } from "./extract.js";

const NOW = new Date("2026-08-20T00:00:00Z");

const item = (text: string, over: Partial<RawItem> = {}): RawItem => ({
  source: "hn",
  url: "https://news.ycombinator.com/item?id=1",
  text,
  ...over,
});

const REAL = "Calendly's timezone handling breaks on every DST change and support just says refresh.";

describe("quoteAppearsIn", () => {
  it("accepts a quote copied exactly", () => {
    expect(quoteAppearsIn(REAL, item(REAL))).toBe(true);
  });

  it("accepts a quote that differs only in whitespace and case", () => {
    expect(quoteAppearsIn("CALENDLY'S   TIMEZONE\n HANDLING BREAKS", item(REAL))).toBe(true);
  });

  /** The failure this exists to catch: a model tidying a quote to be helpful. */
  it("rejects a paraphrase", () => {
    expect(quoteAppearsIn("Calendly has problems with timezones and DST", item(REAL))).toBe(false);
  });

  it("rejects a quote invented outright", () => {
    expect(quoteAppearsIn("This product raised forty million dollars", item(REAL))).toBe(false);
  });

  it("finds a quote taken from the item's title", () => {
    expect(quoteAppearsIn("scheduling is broken", item("body text", { title: "Why scheduling is broken" }))).toBe(true);
  });

  it("rejects a fragment too short to be evidence of anything", () => {
    expect(quoteAppearsIn("breaks", item(REAL))).toBe(false);
  });
});

describe("extract", () => {
  const items = [item(REAL), item("Second complaint about pricing tiers going up again this year.")];

  function modelReturning(rows: unknown): FakeModel {
    return new FakeModel(
      { "structured evidence rows": JSON.stringify(rows), "Classify the market": "single_player_saas" },
      "[]",
    );
  }

  it("keeps a row whose quote really is in the source", async () => {
    const result = await extract(
      items,
      ["Calendly"],
      modelReturning([{ item: 0, kind: "complaint", quote: REAL, competitor: "Calendly", theme: "timezones" }]),
      NOW,
    );
    expect(result.evidence).toHaveLength(1);
    expect(result.paraphrased).toBe(0);
  });

  /**
   * The whole point. A paraphrased quote sends the reader to a page that does
   * not contain the words they were shown, which is indistinguishable from a
   * fabricated source.
   */
  it("drops a row the model paraphrased, and counts it", async () => {
    const result = await extract(
      items,
      ["Calendly"],
      modelReturning([
        { item: 0, kind: "complaint", quote: "Calendly struggles with timezones", competitor: "Calendly" },
      ]),
      NOW,
    );
    expect(result.evidence).toHaveLength(0);
    expect(result.paraphrased).toBe(1);
  });

  it("drops only the bad row, keeping the good one", async () => {
    const result = await extract(
      items,
      ["Calendly"],
      modelReturning([
        { item: 0, kind: "complaint", quote: REAL, competitor: "Calendly" },
        { item: 1, kind: "complaint", quote: "prices keep rising", competitor: "Calendly" },
      ]),
      NOW,
    );
    expect(result.evidence).toHaveLength(1);
    expect(result.paraphrased).toBe(1);
  });

  it("never lets the model supply a URL", async () => {
    const result = await extract(
      items,
      ["Calendly"],
      modelReturning([
        {
          item: 0,
          kind: "complaint",
          quote: REAL,
          competitor: "Calendly",
          url: "https://evil.example.com/fabricated",
        },
      ]),
      NOW,
    );
    expect(result.evidence[0]?.url).toBe("https://news.ycombinator.com/item?id=1");
  });

  /** An archived repo is a fact we already hold; no model is asked about it. */
  it("derives obituaries from archived repos without the model", async () => {
    const result = await extract(
      [item("An abandoned scheduler", { source: "github", url: "https://github.com/a/b", title: "a/b", meta: { archived: true } })],
      [],
      new FakeModel({}, "[]"),
      NOW,
    );
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.kind).toBe("obituary");
  });

  it("survives a model that returns nothing usable", async () => {
    const result = await extract(items, ["Calendly"], new FakeModel({}, "not json at all"), NOW);
    expect(result.evidence).toEqual([]);
    expect(result.paraphrased).toBe(0);
  });
});
