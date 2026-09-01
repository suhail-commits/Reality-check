import { describe, expect, it, vi } from "vitest";
import { cached, cacheKey, MemoryCache } from "./cache.js";

const init = { signal: new AbortController().signal };

describe("cacheKey", () => {
  it("is stable for the same URL and different for a different one", () => {
    expect(cacheKey("https://a.test/x")).toBe(cacheKey("https://a.test/x"));
    expect(cacheKey("https://a.test/x")).not.toBe(cacheKey("https://a.test/y"));
  });
});

describe("MemoryCache", () => {
  it("returns nothing once an entry is older than its TTL", async () => {
    let clock = 0;
    const cache = new MemoryCache(1_000, () => clock);
    await cache.set("k", "body");

    clock = 999;
    expect(await cache.get("k")).toBe("body");

    clock = 1_001;
    expect(await cache.get("k")).toBeNull();
  });
});

describe("cached()", () => {
  it("goes to the network once and serves the second call from the cache", async () => {
    const inner = vi.fn(async () => new Response("payload"));
    const fetcher = cached(inner, new MemoryCache());

    expect(await (await fetcher("https://a.test/x", init)).text()).toBe("payload");
    expect(await (await fetcher("https://a.test/x", init)).text()).toBe("payload");
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("marks which responses came from the cache", async () => {
    const fetcher = cached(async () => new Response("payload"), new MemoryCache());
    expect((await fetcher("https://a.test/x", init)).headers.get("x-rc-cache")).toBe("miss");
    expect((await fetcher("https://a.test/x", init)).headers.get("x-rc-cache")).toBe("hit");
  });

  /** Caching a 503 would turn one bad minute at a free API into a bad day. */
  it("does not cache a failed response", async () => {
    const inner = vi.fn(async () => new Response("nope", { status: 503 }));
    const fetcher = cached(inner, new MemoryCache());

    await fetcher("https://a.test/x", init);
    await fetcher("https://a.test/x", init);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("treats different URLs as different entries", async () => {
    const inner = vi.fn(async (url: string) => new Response(url));
    const fetcher = cached(inner, new MemoryCache());

    expect(await (await fetcher("https://a.test/x", init)).text()).toBe("https://a.test/x");
    expect(await (await fetcher("https://a.test/y", init)).text()).toBe("https://a.test/y");
    expect(inner).toHaveBeenCalledTimes(2);
  });
});
