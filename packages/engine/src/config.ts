import { ADAPTERS, cached, DiskCache, type Fetcher } from "@rc/sources";
import { join } from "node:path";
import { AnthropicModel } from "./anthropic.js";
import type { LanguageModel, Models } from "./model.js";
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

function openAICompatible(
  env: NodeJS.ProcessEnv,
  prefix: "CHEAP" | "PROSE",
): LanguageModel | null {
  const key = env[`${prefix}_API_KEY`];
  const baseUrl = env[`${prefix}_BASE_URL`];
  const model = env[`${prefix}_MODEL`];
  // No model id is invented here. Free tiers retire model names regularly, and
  // a wrong guess fails at request time with a confusing error rather than at
  // startup with a clear one.
  return key && baseUrl && model ? new OpenAICompatibleModel(model, baseUrl, key) : null;
}

/**
 * Builds both model tiers from the environment.
 *
 * Every piece is optional, and the resolution order is designed so that **one
 * free key runs the whole system**: set the `CHEAP_*` trio and the prose tier
 * reuses it. Configure `PROSE_*` separately only when you want a better writer
 * for the one call per run that a person actually reads.
 *
 * A missing tier does not stop a run. It makes one that degrades honestly and
 * lands on GO FIND OUT -- the same rule the adapters follow, one level up:
 * configuration that is absent lowers what the system can claim rather than
 * preventing it from running.
 */
export function buildModels(env: NodeJS.ProcessEnv = process.env): {
  models: Models;
  report: Pick<ConfigReport, "cheap" | "good" | "warnings">;
} {
  const warnings: string[] = [];

  const cheap = openAICompatible(env, "CHEAP") ?? new UnconfiguredModel("cheap tier");
  if (cheap instanceof UnconfiguredModel) {
    warnings.push(
      "Cheap tier unset. Set CHEAP_API_KEY, CHEAP_BASE_URL and CHEAP_MODEL to enable the interview and extraction stages.",
    );
  }

  // Explicit prose provider, then Anthropic if a key happens to be present,
  // then fall back to the cheap tier so a single key runs everything.
  const good =
    openAICompatible(env, "PROSE") ??
    (env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN ? new AnthropicModel() : null) ??
    (cheap instanceof UnconfiguredModel ? new UnconfiguredModel("prose tier") : cheap);

  if (good instanceof UnconfiguredModel) {
    warnings.push("No prose model. Verdicts will have evidence but no written explanation.");
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
