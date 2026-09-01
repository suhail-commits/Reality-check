import type { RawItem } from "@rc/shared";
import type { AdapterContext, SourceAdapter } from "../types.js";

const ENDPOINT = "https://api.github.com/search/repositories";
const PER_PAGE = 30;

interface Repo {
  full_name: string;
  html_url: string;
  description?: string | null;
  archived?: boolean;
  stargazers_count?: number;
  pushed_at?: string | null;
  created_at?: string | null;
  owner?: { login?: string } | null;
}

interface SearchResponse {
  items?: Repo[];
}

/** Long enough that the project is dead rather than merely quiet. */
const STALE_MONTHS = 24;
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/**
 * GitHub, via the repository search API.
 *
 * Here for one reason that no other free source provides: **an archived
 * repository is an obituary.** It is a shutdown someone recorded, with a date,
 * a description of what it did, and a URL that still resolves. That is what
 * lets two adapters cover the graveyard signal without a Crunchbase bill.
 *
 * Unauthenticated search is limited to about 10 requests a minute, which is
 * ample for a wave or two and is why v1 needs no token. When one is present it
 * is used, and when it is absent nothing breaks.
 */
export const github: SourceAdapter = {
  id: "github",
  feeds: ["competitors", "graveyard"],
  rateLimit: { minIntervalMs: 6_500, burst: 1 },

  // Works without a token; a token only raises the ceiling.
  enabled: () => true,

  async fetch(query, ctx: AdapterContext): Promise<RawItem[]> {
    // The FIRST keyword only, never every keyword concatenated. These are
    // relevance searches: more terms narrows the match rather than widening
    // it, and a six-term query reliably returns nothing at all.
    const term = query.competitor ?? query.keywords[0] ?? "";
    if (term.length === 0) return [];
    const url = `${ENDPOINT}?q=${encodeURIComponent(term)}&sort=stars&order=desc&per_page=${PER_PAGE}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "idea-reality-check",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await ctx.fetch(url, { signal: ctx.signal, headers });
    if (!res.ok) throw new Error(`github: HTTP ${res.status}`);

    const body = (await res.json()) as SearchResponse;
    const repos = body.items ?? [];

    return repos.flatMap((repo): RawItem[] => {
      const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : undefined;
      const stale =
        pushedAt !== undefined &&
        ctx.now.getTime() - pushedAt.getTime() > STALE_MONTHS * MS_PER_MONTH;

      const description = repo.description?.trim() ?? "";
      if (description.length === 0) return [];

      const item: RawItem = {
        source: "github",
        url: repo.html_url,
        title: repo.full_name,
        text: description,
        meta: {
          // The graveyard signal. Extraction turns these into obituaries.
          archived: repo.archived === true,
          stale,
          stars: repo.stargazers_count ?? 0,
          lastPushedAt: repo.pushed_at ?? null,
        },
      };

      if (repo.owner?.login) item.author = repo.owner.login;
      if (repo.created_at) item.postedAt = new Date(repo.created_at);
      if (query.competitor) item.competitorId = query.competitor;

      return [item];
    });
  },
};
