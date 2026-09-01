import type { MarketQuery } from "@rc/shared";
import { describe, expect, it } from "vitest";
import { GITHUB_SEARCH, HN_SEARCH, stubFetcher } from "../fixtures/recorded.js";
import type { AdapterContext } from "../types.js";
import { github } from "./github.js";
import { hn, toPlainText } from "./hn.js";

const NOW = new Date("2026-08-20T00:00:00Z");
const QUERY: MarketQuery = { keywords: ["scheduling tools"] };

function ctx(payload: unknown, status = 200): AdapterContext {
  return {
    fetch: stubFetcher(payload, status),
    signal: new AbortController().signal,
    now: NOW,
  };
}

describe("toPlainText", () => {
  it("unescapes the entities Algolia returns", () => {
    expect(toPlainText("<p>Calendly&#x27;s &quot;fix&quot; &amp; the &#x2F;teams plan</p>")).toBe(
      `Calendly's "fix" & the /teams plan`,
    );
  });

  it("strips tags without gluing words together", () => {
    expect(toPlainText("<p>one</p><p>two</p>")).toBe("one two");
  });
});

describe("hn adapter", () => {
  it("needs no configuration", () => {
    expect(hn.enabled()).toBe(true);
  });

  it("maps a recorded search into raw items", async () => {
    const items = await hn.fetch(QUERY, ctx(HN_SEARCH));
    expect(items).toHaveLength(3); // the "+1" comment is dropped
    expect(items[0]).toMatchObject({
      source: "hn",
      url: "https://news.ycombinator.com/item?id=38401234",
      author: "someuser",
    });
    expect(items[0]?.text).toContain("timezone handling breaks");
    expect(items[0]?.text).not.toContain("<p>");
  });

  it("drops comments too short to be evidence of anything", async () => {
    const items = await hn.fetch(QUERY, ctx(HN_SEARCH));
    expect(items.map((i) => i.text)).not.toContain("+1");
  });

  it("survives a hit with no author and no date", async () => {
    const items = await hn.fetch(QUERY, ctx(HN_SEARCH));
    const undated = items.find((i) => i.url.endsWith("38411111"));
    expect(undated).toBeDefined();
    expect(undated?.postedAt).toBeUndefined();
    expect(undated?.author).toBeUndefined();
  });

  /**
   * Timestamps on every hit are why posts-per-month is a usable trend series
   * from this adapter alone -- no Trends, no Reddit, no npm.
   */
  it("preserves timestamps, which is what makes it a trend source", async () => {
    const items = await hn.fetch(QUERY, ctx(HN_SEARCH));
    const dated = items.filter((i) => i.postedAt instanceof Date);
    expect(dated.length).toBeGreaterThanOrEqual(2);
  });

  /** Wave 2 asks about one named competitor, so attribution comes from the query. */
  it("attributes items to the competitor on a wave-2 query", async () => {
    const items = await hn.fetch({ ...QUERY, competitor: "calendly" }, ctx(HN_SEARCH));
    expect(items.every((i) => i.competitorId === "calendly")).toBe(true);
  });

  it("leaves items unattributed on a wave-1 query", async () => {
    const items = await hn.fetch(QUERY, ctx(HN_SEARCH));
    expect(items.every((i) => i.competitorId === undefined)).toBe(true);
  });

  /**
   * Regression. `keywords.join(" ")` sent HN the whole keyword list as one
   * relevance query, which narrows the match instead of widening it. Exposed by
   * `validate "a scheduling tool that handles timezones properly"` returning 0
   * results where the same adapter had returned 48 the day before.
   */
  it("searches the primary keyword only, never every keyword concatenated", async () => {
    let searched = "";
    await hn.fetch(
      { keywords: ["scheduling tool", "calendly", "timezone bug", "meetings"] },
      {
        ...ctx(HN_SEARCH),
        fetch: async (url) => {
          searched = decodeURIComponent(new URL(url).searchParams.get("query") ?? "");
          return new Response(JSON.stringify(HN_SEARCH));
        },
      },
    );
    expect(searched).toBe("scheduling tool");
    expect(searched).not.toContain("calendly");
  });

  it("returns nothing rather than searching an empty string", async () => {
    expect(await hn.fetch({ keywords: [""] }, ctx(HN_SEARCH))).toEqual([]);
  });

  it("throws on a bad status so the registry can record it as failed", async () => {
    await expect(hn.fetch(QUERY, ctx({}, 503))).rejects.toThrow("503");
  });

  it("returns nothing rather than throwing when the payload has no hits", async () => {
    expect(await hn.fetch(QUERY, ctx({}))).toEqual([]);
  });
});

describe("github adapter", () => {
  it("works without a token", () => {
    expect(github.enabled()).toBe(true);
  });

  /** The whole reason this adapter is in v1: archived repos are obituaries. */
  it("preserves the archived flag, which is the graveyard signal", async () => {
    const items = await github.fetch(QUERY, ctx(GITHUB_SEARCH));
    const dead = items.find((i) => i.title === "deadco/schedulr");
    expect(dead?.meta?.archived).toBe(true);

    const alive = items.find((i) => i.title === "calcom/cal.com");
    expect(alive?.meta?.archived).toBe(false);
  });

  it("marks a repo untouched for two years as stale", async () => {
    const items = await github.fetch(QUERY, ctx(GITHUB_SEARCH));
    expect(items.find((i) => i.title === "deadco/schedulr")?.meta?.stale).toBe(true);
    expect(items.find((i) => i.title === "calcom/cal.com")?.meta?.stale).toBe(false);
  });

  it("drops a repo with no description, since there is nothing to extract", async () => {
    const items = await github.fetch(QUERY, ctx(GITHUB_SEARCH));
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.title)).not.toContain("someone/untitled");
  });

  it("sends a User-Agent, which the GitHub API requires", async () => {
    let headers: Record<string, string> | undefined;
    await github.fetch(QUERY, {
      ...ctx(GITHUB_SEARCH),
      fetch: async (_url, init) => {
        headers = init.headers;
        return new Response(JSON.stringify(GITHUB_SEARCH));
      },
    });
    expect(headers?.["User-Agent"]).toBeTruthy();
  });

  it("searches the primary keyword only, never every keyword concatenated", async () => {
    let searched = "";
    await github.fetch(
      { keywords: ["scheduling tool", "calendly", "timezone bug"] },
      {
        ...ctx(GITHUB_SEARCH),
        fetch: async (url) => {
          searched = decodeURIComponent(new URL(url).searchParams.get("q") ?? "");
          return new Response(JSON.stringify(GITHUB_SEARCH));
        },
      },
    );
    expect(searched).toBe("scheduling tool");
  });

  it("throws on a bad status so the registry can record it as failed", async () => {
    await expect(github.fetch(QUERY, ctx({}, 403))).rejects.toThrow("403");
  });

  it("returns nothing rather than throwing when the payload has no items", async () => {
    expect(await github.fetch(QUERY, ctx({}))).toEqual([]);
  });
});
