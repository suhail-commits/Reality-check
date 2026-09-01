import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Fetcher } from "./types.js";

export interface ResponseCache {
  get(key: string): Promise<string | null>;
  set(key: string, body: string): Promise<void>;
}

export function cacheKey(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

/** For tests, and for a single run that queries the same competitor twice. */
export class MemoryCache implements ResponseCache {
  private readonly store = new Map<string, { body: string; at: number }>();

  constructor(
    private readonly ttlMs = 24 * 60 * 60 * 1000,
    private readonly clock: () => number = Date.now,
  ) {}

  async get(key: string): Promise<string | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (this.clock() - hit.at > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return hit.body;
  }

  async set(key: string, body: string): Promise<void> {
    this.store.set(key, { body, at: this.clock() });
  }
}

/**
 * Responses on disk, so seeding dossiers offline does not re-hit a free API
 * every time and a re-run during development costs nothing.
 *
 * A cache miss and a cache failure are the same thing here: return null and let
 * the adapter go to the network. A broken cache must never be able to fail a
 * run.
 */
export class DiskCache implements ResponseCache {
  constructor(
    private readonly dir: string,
    private readonly ttlMs = 24 * 60 * 60 * 1000,
    private readonly clock: () => number = Date.now,
  ) {}

  private path(key: string): string {
    return join(this.dir, key.slice(0, 2), `${key}.json`);
  }

  async get(key: string): Promise<string | null> {
    try {
      const raw = await readFile(this.path(key), "utf8");
      const parsed = JSON.parse(raw) as { at: number; body: string };
      if (this.clock() - parsed.at > this.ttlMs) return null;
      return parsed.body;
    } catch {
      return null;
    }
  }

  async set(key: string, body: string): Promise<void> {
    try {
      const file = this.path(key);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify({ at: this.clock(), body }), "utf8");
    } catch {
      // A cache that cannot write is a slower run, not a failed one.
    }
  }
}

/**
 * Wraps a fetcher so every GET goes through the cache first. Only successful
 * responses are stored -- caching a 500 would turn one bad minute at a free API
 * into a bad day.
 */
export function cached(fetcher: Fetcher, cache: ResponseCache): Fetcher {
  return async (url, init): Promise<Response> => {
    const key = cacheKey(url);

    const hit = await cache.get(key);
    if (hit !== null) {
      return new Response(hit, { status: 200, headers: { "x-rc-cache": "hit" } });
    }

    const res = await fetcher(url, init);
    if (!res.ok) return res;

    const body = await res.text();
    await cache.set(key, body);
    return new Response(body, { status: res.status, headers: { "x-rc-cache": "miss" } });
  };
}
