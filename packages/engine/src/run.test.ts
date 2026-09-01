import type { TraceEvent } from "@rc/shared";
import { hn } from "@rc/sources";
import { beforeEach, describe, expect, it } from "vitest";
import { BrokenModel, FakeModel } from "./model.js";
import { run } from "./run.js";
import { MemoryStore } from "./store.js";
import type { EngineDeps } from "./types.js";

const NOW = new Date("2026-08-20T00:00:00Z");

/** Enough HN hits to clear MIN_EVIDENCE once extraction has run. */
const HN_PAYLOAD = {
  hits: Array.from({ length: 14 }, (_, i) => ({
    objectID: `hit_${i}`,
    story_title: "Ask HN: scheduling tools",
    comment_text: `<p>Calendly timezone handling breaks on every DST change, incident number ${i}.</p>`,
    author: `user_${i}`,
    created_at: "2026-05-01T00:00:00.000Z",
  })),
};

/** The cheap model's replies, keyed by a phrase unique to each prompt. */
const CHEAP = new FakeModel(
  {
    "searchable problem statement": JSON.stringify({
      problem: "Scheduling tools mishandle timezones",
      payer: "Teams booking external meetings",
      currentAlternative: "Calendly",
      costOfInaction: "Meetings land at the wrong hour",
      statedWedge: "timezone handling that is actually correct",
      keywords: ["scheduling tool", "calendly", "timezone bug"],
    }),
    "list products that already exist": JSON.stringify(["Calendly"]),
    "structured evidence rows": JSON.stringify([
      ...Array.from({ length: 10 }, (_, i) => ({
        item: i,
        kind: "complaint",
        quote: `Calendly timezone handling breaks on every DST change, incident number ${i}.`,
        competitor: "Calendly",
        theme: "timezone handling",
      })),
      {
        item: 11,
        kind: "praise",
        quote: "Calendly timezone handling breaks on every DST change, incident number 11.",
        competitor: "Calendly",
      },
    ]),
    "Classify the market": "single_player_saas",
  },
  "[]",
);

const GOOD = new FakeModel(
  {
    "explain a verdict": "Users are angry about timezones [ev_001]. This sentence has no source.",
  },
  "",
);

function deps(over: Partial<EngineDeps> = {}): EngineDeps {
  return {
    models: { cheap: CHEAP, good: GOOD },
    adapters: [hn],
    fetch: async () => new Response(JSON.stringify(HN_PAYLOAD)),
    store: new MemoryStore(),
    now: () => NOW,
    gatherDeadlineMs: 2_000,
    ...over,
  };
}

let events: TraceEvent[] = [];
const emit = (e: TraceEvent) => events.push(e);
beforeEach(() => {
  events = [];
});

describe("run", () => {
  it("produces a verdict end to end", async () => {
    const result = await run({ ideaText: "a better scheduling tool" }, deps(), emit);
    expect(result.verdict.verdict).toBeTruthy();
    expect(result.dossier.evidence.length).toBeGreaterThan(0);
    expect(result.spec.keywords).toContain("calendly");
  });

  it("emits every stage in order", async () => {
    await run({ ideaText: "a better scheduling tool" }, deps(), emit);
    const stages = events.filter((e) => e.type === "stage_start").map((e) => e.stage);
    expect(stages).toEqual(["interview", "canonicalize", "gather", "extract", "judge"]);
  });

  /**
   * The architectural claim, tested rather than asserted in a comment.
   *
   * The prose model is swapped for one that writes something completely
   * different, and one that fails outright. The verdict, the rule that fired,
   * and every score stay identical -- because nothing downstream of the rubric
   * can reach back and change them.
   */
  it("gives the same verdict no matter what the prose model says", async () => {
    const base = await run({ ideaText: "a better scheduling tool" }, deps());

    const contrarian = new FakeModel(
      { "explain a verdict": "This is a terrible idea and nobody wants it [ev_001]." },
      "",
    );
    const withContrarian = await run(
      { ideaText: "a better scheduling tool" },
      deps({ models: { cheap: CHEAP, good: contrarian } }),
    );

    const withBroken = await run(
      { ideaText: "a better scheduling tool" },
      deps({ models: { cheap: CHEAP, good: new BrokenModel() } }),
    );

    expect(withContrarian.verdict.verdict).toBe(base.verdict.verdict);
    expect(withBroken.verdict.verdict).toBe(base.verdict.verdict);
    expect(withContrarian.verdict.firedRule).toBe(base.verdict.firedRule);
    expect(withBroken.verdict.scores).toEqual(base.verdict.scores);
  });

  it("keeps the verdict when the prose model fails entirely", async () => {
    const result = await run(
      { ideaText: "a better scheduling tool" },
      deps({ models: { cheap: CHEAP, good: new BrokenModel() } }),
      emit,
    );
    expect(result.verdict.prose).toBe("");
    expect(result.verdict.verdict).toBeTruthy();
    expect(events.some((e) => e.type === "degraded" && e.stage === "judge")).toBe(true);
  });

  /** Invariant 4, at the pipeline level rather than the unit level. */
  it("drops the uncited sentence the model wrote", async () => {
    const result = await run({ ideaText: "a better scheduling tool" }, deps(), emit);
    expect(result.verdict.prose).not.toContain("no source");
    expect(result.verdict.prose).toContain("[ev_001]");
    expect(result.verdict.citedEvidenceIds).toContain("ev_001");
  });

  it("never cites an evidence id that is not in the dossier", async () => {
    const result = await run({ ideaText: "a better scheduling tool" }, deps());
    const real = new Set(result.dossier.evidence.map((e) => e.id));
    for (const id of result.verdict.citedEvidenceIds) expect(real.has(id)).toBe(true);
  });

  /** The model supplies an item index; the URL comes from our own RawItem. */
  it("attaches URLs from the source, never from the model", async () => {
    const result = await run({ ideaText: "a better scheduling tool" }, deps());
    for (const e of result.dossier.evidence) {
      expect(e.url).toMatch(/^https:\/\/news\.ycombinator\.com\/item\?id=/);
    }
  });

  describe("the market match", () => {
    it("is always announced, even on a fresh market", async () => {
      await run({ ideaText: "a better scheduling tool" }, deps(), emit);
      const matched = events.find((e) => e.type === "market_matched");
      expect(matched).toBeDefined();
      expect(matched?.type === "market_matched" && matched.fresh).toBe(true);
    });

    it("reuses the dossier on a second, similar idea", async () => {
      const shared = deps({ store: new MemoryStore() });
      await run({ ideaText: "a better scheduling tool" }, shared);

      events = [];
      const second = await run({ ideaText: "a scheduling app for teams" }, shared, emit);

      const matched = events.find((e) => e.type === "market_matched");
      expect(matched?.type === "market_matched" && matched.fresh).toBe(false);
      expect(events.some((e) => e.type === "stage_start" && e.stage === "gather")).toBe(false);
      expect(second.verdict.verdict).toBeTruthy();
    });

    it("gathers again when the user says it is not their market", async () => {
      const shared = deps({ store: new MemoryStore() });
      await run({ ideaText: "a better scheduling tool" }, shared);

      events = [];
      await run({ ideaText: "a better scheduling tool", forceFresh: true }, shared, emit);
      expect(events.some((e) => e.type === "stage_start" && e.stage === "gather")).toBe(true);
    });
  });

  describe("degradation", () => {
    it("still returns a verdict when every adapter fails", async () => {
      const result = await run(
        { ideaText: "a better scheduling tool" },
        deps({
          fetch: async () => {
            throw new Error("network down");
          },
        }),
        emit,
      );
      expect(result.verdict.verdict).toBe("GO_FIND_OUT");
      expect(result.verdict.confidence.band).toBe("low");
    });

    it("falls back to a keyword spec when the interview model breaks", async () => {
      const result = await run(
        { ideaText: "a better scheduling tool" },
        deps({ models: { cheap: new BrokenModel(), good: GOOD } }),
        emit,
      );
      expect(result.spec.keywords.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === "degraded" && e.stage === "interview")).toBe(true);
    });
  });

  /**
   * Regression. The degraded interview used to emit the raw sentence as
   * keywords[0], which adapters then searched verbatim and matched nothing --
   * so a missing API key silently became a missing gather.
   */
  it("still produces a usable search term when the interview model is down", async () => {
    const result = await run(
      { ideaText: "a scheduling tool that handles timezones properly" },
      deps({ models: { cheap: new BrokenModel(), good: GOOD } }),
    );
    const primary = result.spec.keywords[0] as string;
    expect(primary.split(" ").length).toBeLessThanOrEqual(3);
    expect(primary).not.toContain("that");
  });

  it("is deterministic for the same inputs", async () => {
    const a = await run({ ideaText: "a better scheduling tool" }, deps());
    const b = await run({ ideaText: "a better scheduling tool" }, deps());
    expect(b.verdict.verdict).toBe(a.verdict.verdict);
    expect(b.verdict.scores).toEqual(a.verdict.scores);
  });
});
