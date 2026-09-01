import type { LanguageModel } from "./model.js";

/**
 * The cheap tier: one client, any provider.
 *
 * Groq, OpenRouter, DeepSeek and Gemini all expose an OpenAI-shaped
 * `/chat/completions` endpoint, so a single implementation covers every free
 * tier worth using and switching providers is three environment variables
 * rather than a code change. That matters more than it sounds: free tiers
 * change their terms and retire models, and this is ~90% of the token spend.
 *
 * Nothing here can reach a verdict. It classifies and quotes; the rubric counts.
 */
export class OpenAICompatibleModel implements LanguageModel {
  constructor(
    readonly id: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.id,
        max_tokens: request.maxTokens ?? 2048,
        // Extraction and classification want the same answer every time.
        temperature: 0,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`${this.id}: HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return body.choices?.[0]?.message?.content ?? "";
  }
}

/**
 * Stands in for a provider that was never configured.
 *
 * It throws, which every stage already treats as a degradation: the interview
 * falls back to keywords, extraction yields nothing, prose comes back empty,
 * and the run ends at GO FIND OUT with low confidence. That is the honest
 * outcome for "no model configured" -- visible in the verdict rather than
 * hidden in a crash.
 */
export class UnconfiguredModel implements LanguageModel {
  readonly id = "unconfigured";
  constructor(private readonly which: string) {}
  async complete(): Promise<string> {
    throw new Error(`${this.which}: no provider configured`);
  }
}
