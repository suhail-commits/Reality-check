import {
  Evidence,
  type Competitor,
  type MarketShape,
  type RawItem,
  type SourceId,
} from "@rc/shared";
import { parseJson, type LanguageModel } from "../model.js";

const COMPETITOR_SYSTEM = `You list products that already exist in a market.

You are given search results. Return ONLY a JSON array of product names that are
real, existing products competing in this space. Include at most 6, most
prominent first. Exclude generic phrases, article titles, and the user's own
idea. If none exist, return [].`;

const EXTRACT_SYSTEM = `You turn search results into structured evidence rows.

You may quote and you may classify. You may NOT score, rate, rank, or estimate
anything numerically. Every number in this system is computed elsewhere.

For each numbered item, decide whether it contains evidence, and return ONLY a
JSON array of objects:
  { "item": <number>, "kind": "...", "quote": "<verbatim from the item>", ... }

kind must be one of:
  complaint  - a specific grievance. Also set "competitor" (name) and "theme"
               (a short phrase naming the grievance, reused across items)
  praise     - a specific expression of satisfaction. Also set "competitor",
               and "theme" when there is a clear one
  obituary   - a product that shut down. Also set "name" and "causeOfDeath":
               no_demand | unit_economics | regulatory | execution |
               founder_quit | ran_out_of_runway | acquired | pivoted_away | unknown
  barrier    - a documented obstacle to entering. Also set "barrier":
               capital_intensity | regulatory_burden | network_effects |
               data_moat | switching_costs | distribution_lock

Rules:
- "quote" must appear verbatim in the item. Never paraphrase, never invent.
- Skip items that contain no evidence. Most items contain none.
- Use the SAME theme wording for the same grievance across different products.
  A grievance that recurs across products is the single most important pattern
  in this data.
- Do not output a URL. Never output a score.`;

const SHAPE_SYSTEM = `Classify the market's shape. Return ONLY one of these words:
single_player_saas two_sided_marketplace consumer_app developer_tool hardware regulated_service unknown`;

interface RawRow {
  item?: number;
  kind?: string;
  quote?: string;
  competitor?: string;
  theme?: string;
  name?: string;
  causeOfDeath?: string;
  barrier?: string;
}

const numbered = (items: RawItem[]) =>
  items
    .map((it, i) => `[${i}] ${it.title ? `${it.title} - ` : ""}${it.text.slice(0, 600)}`)
    .join("\n\n");

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function findCompetitors(items: RawItem[], model: LanguageModel): Promise<string[]> {
  if (items.length === 0) return [];
  try {
    const raw = await model.complete({
      system: COMPETITOR_SYSTEM,
      prompt: numbered(items.slice(0, 40)),
      maxTokens: 512,
    });
    const parsed = parseJson<unknown[]>(raw) ?? [];
    return parsed
      .filter((n): n is string => typeof n === "string" && n.trim().length > 1)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export interface ExtractResult {
  evidence: Evidence[];
  competitors: Competitor[];
  marketShape: MarketShape;
  degraded: string | null;
}

/**
 * Stage 4 -- Extract.
 *
 * Two guarantees are enforced here rather than asked for in the prompt, because
 * a prompt is a request and this is the integrity boundary:
 *
 * 1. **The model never supplies a URL.** It references an item by index; the
 *    URL is attached from our own `RawItem`. A hallucinated source is therefore
 *    not merely discouraged, it is unrepresentable.
 * 2. **Every row is parsed against the `Evidence` schema and dropped if it
 *    fails.** A malformed cause of death or an unknown kind costs one row, not
 *    the run.
 *
 * Obituaries from archived GitHub repositories are derived directly from the
 * adapter's `meta.archived`, with no model involved at all. A fact we already
 * hold is not worth asking a model to re-derive, and it cannot get it wrong.
 */
export async function extract(
  items: RawItem[],
  competitorNames: string[],
  model: LanguageModel,
  now: Date,
): Promise<ExtractResult> {
  const competitors: Competitor[] = competitorNames.map((name) => ({ id: slug(name), name }));
  const knownIds = new Set(competitors.map((c) => c.id));
  const evidence: Evidence[] = [];
  let counter = 0;
  const nextId = () => `ev_${(++counter).toString().padStart(3, "0")}`;

  // Deterministic first: an archived repo is an obituary we already know about.
  for (const item of items) {
    if (item.source !== "github" || item.meta?.archived !== true) continue;
    evidence.push({
      id: nextId(),
      kind: "obituary",
      source: "github",
      url: item.url,
      quote: item.text.slice(0, 400),
      name: item.title ?? item.url,
      causeOfDeath: "unknown",
      ...(item.postedAt ? { postedAt: item.postedAt } : {}),
      retrievedAt: now,
    });
  }

  let degraded: string | null = null;
  let marketShape: MarketShape = "unknown";

  const batchable = items.filter((i) => i.text.length >= 40).slice(0, 60);

  try {
    const raw = await model.complete({
      system: EXTRACT_SYSTEM,
      prompt: numbered(batchable),
      maxTokens: 4096,
    });
    const rows = parseJson<RawRow[]>(raw) ?? [];

    for (const row of rows) {
      const item = typeof row.item === "number" ? batchable[row.item] : undefined;
      if (!item || !row.quote) continue;

      const competitorName = row.competitor ?? item.competitorId;
      const competitorId = competitorName ? slug(competitorName) : undefined;
      if (competitorId && !knownIds.has(competitorId)) {
        knownIds.add(competitorId);
        competitors.push({ id: competitorId, name: competitorName as string });
      }

      const base = {
        id: nextId(),
        source: item.source as SourceId,
        // Ours, never the model's.
        url: item.url,
        quote: row.quote,
        ...(item.author ? { author: item.author } : {}),
        ...(item.postedAt ? { postedAt: item.postedAt } : {}),
        retrievedAt: now,
      };

      const candidate =
        row.kind === "complaint" || row.kind === "praise"
          ? { ...base, kind: row.kind, competitorId, theme: row.theme }
          : row.kind === "obituary"
            ? { ...base, kind: "obituary", name: row.name, causeOfDeath: row.causeOfDeath }
            : row.kind === "barrier"
              ? { ...base, kind: "barrier", barrier: row.barrier }
              : null;

      if (!candidate) continue;

      // The schema is the gate. A row the model got wrong costs one row.
      const parsed = Evidence.safeParse(candidate);
      if (parsed.success) evidence.push(parsed.data);
    }
  } catch (error) {
    degraded = `extract: ${error instanceof Error ? error.message : "failed"}`;
  }

  try {
    const shape = (await model.complete({
      system: SHAPE_SYSTEM,
      prompt: competitorNames.join(", ") || "unknown market",
      maxTokens: 16,
    }))
      .trim()
      .toLowerCase()
      .replace(/[^a-z_]/g, "");
    const allowed: MarketShape[] = [
      "single_player_saas",
      "two_sided_marketplace",
      "consumer_app",
      "developer_tool",
      "hardware",
      "regulated_service",
      "unknown",
    ];
    if ((allowed as string[]).includes(shape)) marketShape = shape as MarketShape;
  } catch {
    // `unknown` implies no structural barriers, which is the neutral default.
  }

  return { evidence, competitors, marketShape, degraded };
}
