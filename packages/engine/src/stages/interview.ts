import type { IdeaSpec } from "@rc/shared";
import { parseJson, type LanguageModel } from "../model.js";
import { tokenize } from "../types.js";

const SYSTEM = `You turn a vague product idea into a searchable problem statement.

You are not judging the idea. You are sharpening it so a research pipeline can
find what people have already written about this market.

Return ONLY a JSON object with these keys:
  problem            the pain, in the user's own framing, made specific
  payer              who opens their wallet
  currentAlternative what they do today, including "nothing"
  costOfInaction     what breaks if it stays unsolved
  statedWedge        how the user thinks they are different, or null
  keywords           4-8 search terms: product category, likely competitor
                     names, and the words a frustrated user would actually type

Keywords decide what the pipeline finds, so make them the terms a real person
would search, not marketing language.`;

/**
 * Stage 1 -- Interview.
 *
 * The stage that separates this from every competitor in the category. They
 * hand the raw blob to a model and hallucinate around it; "an app for dog
 * walkers" is not a searchable problem statement, and a pipeline fed that
 * retrieves noise and then confidently scores it.
 *
 * If the model is unavailable, this degrades to a keyword-only spec rather than
 * failing the run: a thin spec means a thin gather, which means low evidence,
 * which routes to GO FIND OUT. The failure is visible in the verdict rather
 * than hidden in a stack trace.
 */
export async function interview(
  ideaText: string,
  answers: Partial<Record<string, string>>,
  model: LanguageModel,
): Promise<{ spec: IdeaSpec; degraded: string | null }> {
  const stated = Object.entries(answers)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Idea: ${ideaText}\n${stated ? `\nWhat they told us:\n${stated}` : "\n(They skipped the questions.)"}`;

  try {
    const raw = await model.complete({ system: SYSTEM, prompt, maxTokens: 1024 });
    const parsed = parseJson<Partial<IdeaSpec>>(raw);
    if (!parsed) return { spec: fallbackSpec(ideaText, answers), degraded: "interview: unparseable reply" };

    const keywords = (parsed.keywords ?? []).filter((k) => typeof k === "string" && k.length > 1);

    return {
      spec: {
        problem: parsed.problem || ideaText,
        payer: parsed.payer || answers.payer || "unknown",
        currentAlternative: parsed.currentAlternative || answers.alternative || "unknown",
        costOfInaction: parsed.costOfInaction || answers.inaction || "unknown",
        ...(parsed.statedWedge ? { statedWedge: parsed.statedWedge } : {}),
        keywords: keywords.length > 0 ? keywords : fallbackKeywords(ideaText),
      },
      degraded: null,
    };
  } catch (error) {
    return {
      spec: fallbackSpec(ideaText, answers),
      degraded: `interview: ${error instanceof Error ? error.message : "failed"}`,
    };
  }
}

/**
 * Search terms when the model is unavailable.
 *
 * The primary term is the three most meaningful words, NOT the raw sentence:
 * adapters search on keywords[0], and a full sentence is a query that matches
 * nothing. A degraded interview should narrow what we find, not eliminate it.
 */
function fallbackKeywords(ideaText: string): string[] {
  const tokens = tokenize(ideaText);
  if (tokens.length === 0) return [ideaText.trim() || "idea"];
  return [tokens.slice(0, 3).join(" "), ...tokens.slice(0, 4)];
}

function fallbackSpec(ideaText: string, answers: Partial<Record<string, string>>): IdeaSpec {
  return {
    problem: ideaText,
    payer: answers.payer || "unknown",
    currentAlternative: answers.alternative || "unknown",
    costOfInaction: answers.inaction || "unknown",
    keywords: fallbackKeywords(ideaText),
  };
}
