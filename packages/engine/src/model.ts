/**
 * The model boundary.
 *
 * Injected rather than imported, for the same reason `Fetcher` is in
 * `packages/sources`: every stage that touches a model has to be testable
 * offline, deterministically, with no key. It also keeps the provider a
 * configuration detail -- the cheap tier can be Gemini, Groq or anything else
 * without a stage knowing.
 *
 * Note what this interface cannot do. It returns text. It has no way to hand a
 * number to the rubric, and nothing downstream asks it for one.
 */
export interface LanguageModel {
  /** For traces and cost accounting. */
  id: string;
  complete(request: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string>;
}

/**
 * Two tiers, roughly 90/10 by tokens.
 *
 * `cheap` reads sources and classifies: many calls, all of them mechanical.
 * `good` runs once per validation and writes the explanation of a decision the
 * rubric has already made -- the only text a person actually reads, which is
 * why it is worth paying for.
 */
export interface Models {
  cheap: LanguageModel;
  good: LanguageModel;
}

/**
 * A model that never varies, for tests.
 *
 * Responses are keyed by a substring of the prompt so a stage test can pin the
 * exact reply it needs. Anything unmatched returns `fallback`, so a stage under
 * test fails loudly on an unexpected call rather than quietly getting "".
 */
export class FakeModel implements LanguageModel {
  readonly calls: { system: string; prompt: string }[] = [];

  constructor(
    private readonly responses: Record<string, string> = {},
    private readonly fallback = "",
    readonly id = "fake",
  ) {}

  async complete(request: { system: string; prompt: string }): Promise<string> {
    this.calls.push({ system: request.system, prompt: request.prompt });

    for (const [needle, reply] of Object.entries(this.responses)) {
      if (request.prompt.includes(needle) || request.system.includes(needle)) return reply;
    }
    return this.fallback;
  }
}

/** A model that always fails, for proving a stage degrades rather than crashes. */
export class BrokenModel implements LanguageModel {
  readonly id = "broken";
  constructor(private readonly message = "model unavailable") {}
  async complete(): Promise<string> {
    throw new Error(this.message);
  }
}

/**
 * Models emit JSON in a fenced block about as often as not. Recovering it is
 * the stage's job, not the prompt's -- an extraction pass that throws because
 * the model added three backticks is a fragile pipeline.
 */
export function parseJson<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? raw).trim();

  const start = body.search(/[[{]/);
  if (start === -1) return null;

  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
  if (end <= start) return null;

  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
