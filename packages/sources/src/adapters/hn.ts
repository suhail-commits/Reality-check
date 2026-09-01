import type { RawItem } from "@rc/shared";
import type { AdapterContext, SourceAdapter } from "../types.js";

const ENDPOINT = "https://hn.algolia.com/api/v1/search";
const HITS = 50;

interface AlgoliaHit {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  url?: string | null;
  author?: string | null;
  created_at?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  points?: number | null;
  num_comments?: number | null;
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[];
}

/** Algolia returns comment bodies as HTML fragments. */
export function toPlainText(html: string): string {
  return html
    .replace(/<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hacker News, via the Algolia search API.
 *
 * The first adapter to build and the one that carries v1. It needs no key, has
 * no quota worth worrying about, and has the best signal-to-noise of any free
 * source: people on HN say precisely why a product annoys them.
 *
 * It also returns timestamps on every hit, which means posts-per-month is a
 * usable trend series derived from this source alone -- no Google Trends, no
 * Reddit, no npm. That is most of why two adapters can cover all four signals.
 */
export const hn: SourceAdapter = {
  id: "hn",
  feeds: ["complaints", "competitors", "trend"],
  rateLimit: { minIntervalMs: 350, burst: 4 },

  // No key, no config, nothing to be missing.
  enabled: () => true,

  async fetch(query, ctx: AdapterContext): Promise<RawItem[]> {
    const term = query.competitor ?? query.keywords.join(" ");
    const url = `${ENDPOINT}?query=${encodeURIComponent(term)}&tags=(story,comment)&hitsPerPage=${HITS}`;

    const res = await ctx.fetch(url, { signal: ctx.signal });
    if (!res.ok) throw new Error(`hn: HTTP ${res.status}`);

    const body = (await res.json()) as AlgoliaResponse;
    const hits = body.hits ?? [];

    return hits.flatMap((hit): RawItem[] => {
      const raw = hit.comment_text ?? hit.story_text ?? hit.title ?? "";
      const text = toPlainText(raw);
      if (text.length < 24) return [];

      const item: RawItem = {
        source: "hn",
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        text,
        meta: {
          points: hit.points ?? 0,
          comments: hit.num_comments ?? 0,
          externalUrl: hit.url ?? null,
        },
      };

      const title = hit.title ?? hit.story_title;
      if (title) item.title = title;
      if (hit.author) item.author = hit.author;
      if (hit.created_at) item.postedAt = new Date(hit.created_at);
      if (query.competitor) item.competitorId = query.competitor;

      return [item];
    });
  },
};
