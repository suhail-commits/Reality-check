import Anthropic from "@anthropic-ai/sdk";
import type { LanguageModel } from "./model.js";

/**
 * Claude Haiku 4.5 for the verdict prose.
 *
 * This is the one call per run that anyone actually reads, over evidence the
 * pipeline has already distilled -- so it is short input, short output, once.
 * Haiku 4.5 follows the cite-every-claim instruction reliably and keeps a run
 * to fractions of a cent.
 *
 * Deliberately no extended thinking: Haiku 4.5 predates adaptive thinking, and
 * this is a writing task over facts that are already settled, not a reasoning
 * one. The reasoning happened in `packages/rubric`, without a model.
 */
export class AnthropicModel implements LanguageModel {
  private readonly client: Anthropic;

  constructor(
    readonly id = "claude-haiku-4-5",
    client?: Anthropic,
  ) {
    // Zero-arg constructor resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN,
    // or an `ant auth login` profile. Never hardcode a key.
    this.client = client ?? new Anthropic();
  }

  async complete(request: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.id,
        // Deliberately low: a verdict explanation is a few short paragraphs.
        // Anything longer is the model padding, not explaining.
        max_tokens: request.maxTokens ?? 2048,
        system: [
          {
            type: "text",
            text: request.system,
            // The system prompt is identical on every run; the evidence is not.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: request.prompt }],
      });

      if (response.stop_reason === "refusal") {
        throw new Error("prose: model declined the request");
      }

      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (error) {
      // Typed, most specific first. The caller turns any of these into a
      // degraded run -- a verdict with no prose still has its evidence.
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error("prose: no valid Anthropic credentials");
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error("prose: rate limited");
      }
      if (error instanceof Anthropic.APIError) {
        throw new Error(`prose: API error ${error.status}`);
      }
      throw error;
    }
  }
}
