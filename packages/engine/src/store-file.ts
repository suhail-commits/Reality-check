import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Dossier, Validation } from "@rc/shared";
import type { MarketRecord, MarketStore } from "./types.js";

interface Persisted {
  markets: MarketRecord[];
  dossiers: Record<string, unknown>;
  validations: Record<string, unknown>;
}

const EMPTY: Persisted = { markets: [], dossiers: {}, validations: {} };

/**
 * A JSON file on disk.
 *
 * This is what `pnpm seed` writes into, so the dossiers a recruiter hits at two
 * in the morning were gathered once, offline, on a laptop -- costing nothing
 * and unable to be broken by a rate limit or a dead adapter.
 *
 * Deliberately not SQLite: the shape is a few dozen markets read whole on every
 * run, and a dependency needs a reason beyond convenience. Postgres replaces
 * this behind the same interface when the app is deployed.
 */
export class FileStore implements MarketStore {
  private cache: Persisted | null = null;

  constructor(private readonly path = join(process.cwd(), ".data", "markets.json")) {}

  private async load(): Promise<Persisted> {
    if (this.cache) return this.cache;
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as Persisted;
      this.cache = {
        markets: parsed.markets ?? [],
        dossiers: parsed.dossiers ?? {},
        validations: parsed.validations ?? {},
      };
    } catch {
      // A missing or corrupt store is an empty store, never a failed run.
      this.cache = { markets: [], dossiers: {}, validations: {} };
    }
    return this.cache;
  }

  private async flush(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(this.cache ?? EMPTY, null, 2), "utf8");
  }

  async list(): Promise<MarketRecord[]> {
    return [...(await this.load()).markets];
  }

  async create(market: Omit<MarketRecord, "id">): Promise<MarketRecord> {
    const data = await this.load();
    const created = { ...market, id: `mkt_${data.markets.length + 1}` };
    data.markets.push(created);
    await this.flush();
    return created;
  }

  async dossier(marketId: string): Promise<Dossier | null> {
    const raw = (await this.load()).dossiers[marketId];
    if (!raw) return null;
    // Dates arrive as strings from JSON; the schema coerces them back.
    const parsed = Dossier.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }

  async saveDossier(dossier: Dossier): Promise<void> {
    const data = await this.load();
    data.dossiers[dossier.marketId] = dossier;
    await this.flush();
  }

  async saveValidation(validation: Validation, dossier: Dossier): Promise<void> {
    const data = await this.load();
    data.validations[validation.id] = { validation, dossier };
    await this.flush();
  }

  async validation(id: string): Promise<{ validation: Validation; dossier: Dossier } | null> {
    const raw = (await this.load()).validations[id] as
      | { validation: unknown; dossier: unknown }
      | undefined;
    if (!raw) return null;

    const v = Validation.safeParse(raw.validation);
    const d = Dossier.safeParse(raw.dossier);
    return v.success && d.success ? { validation: v.data, dossier: d.data } : null;
  }

  /** Everything stored, for the CLI to list what has been seeded. */
  async summary(): Promise<{ market: MarketRecord; evidence: number; gatheredAt: string }[]> {
    const data = await this.load();
    return data.markets.map((market) => {
      const raw = data.dossiers[market.id] as { evidence?: unknown[]; gatheredAt?: string } | undefined;
      return {
        market,
        evidence: raw?.evidence?.length ?? 0,
        gatheredAt: raw?.gatheredAt ?? "never",
      };
    });
  }
}
