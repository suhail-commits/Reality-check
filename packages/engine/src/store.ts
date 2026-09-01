import type { Dossier } from "@rc/shared";
import type { MarketRecord, MarketStore } from "./types.js";

/**
 * In-memory persistence, for tests and for the CLI seeding a run before the
 * Postgres store exists. Same interface, so nothing above it changes.
 */
export class MemoryStore implements MarketStore {
  private readonly markets: MarketRecord[] = [];
  private readonly dossiers = new Map<string, Dossier>();
  private counter = 0;

  constructor(seed: MarketRecord[] = []) {
    this.markets.push(...seed);
  }

  async list(): Promise<MarketRecord[]> {
    return [...this.markets];
  }

  async create(market: Omit<MarketRecord, "id">): Promise<MarketRecord> {
    const created = { ...market, id: `mkt_${++this.counter}` };
    this.markets.push(created);
    return created;
  }

  async dossier(marketId: string): Promise<Dossier | null> {
    return this.dossiers.get(marketId) ?? null;
  }

  async saveDossier(dossier: Dossier): Promise<void> {
    this.dossiers.set(dossier.marketId, dossier);
  }
}
