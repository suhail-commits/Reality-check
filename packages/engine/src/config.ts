import { ADAPTERS, cached, DiskCache, type Fetcher } from "@rc/sources";
import { join } from "node:path";
import { AnthropicModel } from "./anthropic.js";
import type { Models } from "./model.js";
import { OpenAICompatibleModel, UnconfiguredModel } from "./openai-compatible.js";
import { FileStore } from "./store-file.js";
import type { EngineDeps } from "./types.js";

export interface ConfigReport {
  cheap: string;
  good: string;
  adapters: string[];
  /** Human-readable reasons a tier is missing, for the CLI and the README. */
  warnings: string[];
}

/**
 * Builds the engine's dependencies from the environment.
 *
 * Every piece is optional. A missing cheap-tier key does not stop a run; it
 * makes one that degrades honestly and lands on GO FIND OUT. This is the same
 * rule the adapters follow, applied one level up: configuration that is absent
 * lowers what the system can claim, rather than preventing it from running.
 */
export function buildModels(env: NodeJS.ProcessEnv = process.env): {
  models: Models;
  report: Pick<ConfigReport, "cheap" | "good" | "warnings">;
} {
  const warnings: string[] = [];

  const key = env.CHEAP_API_KEY;
  const baseUrl = env.CHEAP_BASE_URL;
  const model = env.CHEAP_MODEL;

  // No default model id is invented here. Free tiers retire model names
  // regularly, and a wrong guess fails at request time with a confusing error
  // rather than at startup with a clear one.
  const cheap =
    key && baseUrl && model
      ? new OpenAICompatibleModel(model, baseUrl, key)
      : new UnconfiguredModel("cheap tier");

  if (cheap instanceof UnconfiguredModel) {
    warnings.push(
      "Cheap tier unset. Set CHEAP_API_KEY, CHEAP_BASE_URL and CHEAP_MODEL to enable the interview and extraction stages.",
    );
  }

  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  const good = hasAnthropic ? new AnthropicModel() : new UnconfiguredModel("prose tier");
  if (!hasAnthropic) {
    warnings.push("ANTHROPIC_API_KEY unset. Verdicts will have evidence but no written explanation.");
  }

  return { models: { cheap, good }, report: { cheap: cheap.id, good: good.id, warnings } };
}

/** Everything a CLI run needs, with responses cached on disk between runs. */
export function buildDeps(env: NodeJS.ProcessEnv = process.env): {
  deps: EngineDeps;
  report: ConfigReport;
} {
  const { models, report } = buildModels(env);

  const fetcher: Fetcher = cached(
    (url, init) => fetch(url, init as RequestInit),
    new DiskCache(join(process.cwd(), ".cache")),
  );

  return {
    deps: {
      models,
      adapters: ADAPTERS,
      fetch: fetcher,
      store: new FileStore(),
      now: () => new Date(),
      gatherDeadlineMs: Number(env.GATHER_DEADLINE_MS ?? 40_000),
    },
    report: { ...report, adapters: ADAPTERS.map((a) => a.id) },
  };
}
