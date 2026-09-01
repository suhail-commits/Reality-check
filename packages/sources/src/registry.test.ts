import type { MarketQuery, RawItem } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { gather } from "./registry.js";
import type { SourceAdapter } from "./types.js";

const QUERY: MarketQuery = { keywords: ["scheduling tools"] };

const item = (source: RawItem["source"]): RawItem => ({
  source,
  url: `https://example.com/${source}`,
  text: "something a person wrote",
});

function adapter(over: Partial<SourceAdapter> & Pick<SourceAdapter, "id">): SourceAdapter {
  return {
    feeds: ["complaints"],
    enabled: () => true,
    rateLimit: { minIntervalMs: 0, burst: 100 },
    fetch: async () => [item(over.id)],
    ...over,
  };
}

const opts = { fetch: async () => new Response("{}"), now: new Date(), deadlineMs: 1_000 };

describe("gather", () => {
  it("returns everything when both adapters work", async () => {
    const r = await gather([adapter({ id: "hn" }), adapter({ id: "github" })], QUERY, opts);
    expect(r.items).toHaveLength(2);
    expect(r.statuses).toEqual({ hn: "ok", github: "ok" });
  });

  /**
   * The contract that makes adapters safe to add: a broken source costs the run
   * its contribution and nothing else. If this ever throws, every adapter
   * becomes a liability and shipping seven of them would be reckless.
   */
  it("keeps a working adapter's results when another throws", async () => {
    const r = await gather(
      [
        adapter({ id: "hn" }),
        adapter({
          id: "github",
          fetch: async () => {
            throw new Error("HTTP 503");
          },
        }),
      ],
      QUERY,
      opts,
    );

    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.source).toBe("hn");
    expect(r.statuses).toEqual({ hn: "ok", github: "failed" });
    expect(r.outcomes.find((o) => o.adapter === "github")?.error).toContain("503");
  });

  it("never rejects even when every adapter fails", async () => {
    const boom = () => {
      throw new Error("down");
    };
    const r = await gather(
      [adapter({ id: "hn", fetch: boom }), adapter({ id: "github", fetch: boom })],
      QUERY,
      opts,
    );
    expect(r.items).toEqual([]);
    expect(r.statuses).toEqual({ hn: "failed", github: "failed" });
  });

  /**
   * Time is just another way a source can fail. This is what lets the whole
   * gather run under a wall-clock budget without a queue or a worker: the
   * 60-second serverless ceiling produces a lower-confidence verdict instead of
   * a 500.
   */
  it("records an adapter that runs out of time as timed_out, not failed", async () => {
    const r = await gather(
      [
        adapter({ id: "hn" }),
        adapter({
          id: "github",
          fetch: (_q, ctx) =>
            new Promise((_resolve, reject) => {
              ctx.signal.addEventListener("abort", () => reject(new Error("aborted")));
            }),
        }),
      ],
      QUERY,
      { ...opts, deadlineMs: 60 },
    );

    expect(r.statuses).toEqual({ hn: "ok", github: "timed_out" });
    expect(r.items).toHaveLength(1);
  });

  it("passes the deadline signal through to the adapter", async () => {
    let seen: AbortSignal | null = null;
    await gather(
      [adapter({ id: "hn", fetch: async (_q, ctx) => ((seen = ctx.signal), []) })],
      QUERY,
      opts,
    );
    expect(seen).toBeInstanceOf(AbortSignal);
  });

  /** A missing key is a fact about configuration, not an error. */
  it("marks an adapter without config as skipped rather than failed", async () => {
    const r = await gather(
      [adapter({ id: "hn" }), adapter({ id: "reddit", enabled: () => false })],
      QUERY,
      opts,
    );
    expect(r.statuses).toEqual({ hn: "ok", reddit: "skipped" });
  });

  it("never calls a disabled adapter", async () => {
    let called = false;
    await gather(
      [
        adapter({
          id: "reddit",
          enabled: () => false,
          fetch: async () => ((called = true), []),
        }),
      ],
      QUERY,
      opts,
    );
    expect(called).toBe(false);
  });

  it("aborts the run when the caller hangs up", async () => {
    const controller = new AbortController();
    const promise = gather(
      [
        adapter({
          id: "hn",
          fetch: (_q, ctx) =>
            new Promise((_res, rej) => {
              ctx.signal.addEventListener("abort", () => rej(new Error("aborted")));
            }),
        }),
      ],
      QUERY,
      { ...opts, deadlineMs: 5_000, signal: controller.signal },
    );

    controller.abort();
    const r = await promise;
    expect(r.statuses.hn).toBe("timed_out");
  });

  it("reports outcomes in adapter order regardless of who finishes first", async () => {
    const r = await gather(
      [
        adapter({
          id: "hn",
          fetch: async () => {
            await new Promise((res) => setTimeout(res, 30));
            return [item("hn")];
          },
        }),
        adapter({ id: "github" }),
      ],
      QUERY,
      opts,
    );
    expect(r.outcomes.map((o) => o.adapter)).toEqual(["hn", "github"]);
  });
});
