import type { Evidence, RubricResult } from "@rc/shared";
import { enforceCitations, type CitationResult } from "../citations.js";
import type { LanguageModel } from "../model.js";

const SYSTEM = `You explain a verdict that has already been decided.

You are not deciding anything. A deterministic rubric read the evidence and
reached the verdict; your job is to say why, in plain language, to someone who
may not be technical.

Hard rules:
- EVERY sentence must cite at least one evidence id, written as [ev_012].
  Sentences without a citation are deleted before the reader sees them, so an
  uncited sentence is simply wasted.
- Only cite ids that appear in the evidence below. Never invent one.
- Never contradict the verdict. If it says don't build it, do not soften it.
- No score, no percentage, no rating. Numbers are not yours to give.
- Plain words. No "leverage", no "synergies", no "in today's fast-paced".
- 4 to 7 sentences. Lead with what the evidence shows, not with a preamble.`;

const VERDICT_INSTRUCTION: Record<string, string> = {
  BUILD_IT: "Say what the opening is and why their angle fits it.",
  BUILD_IT_DIFFERENTLY:
    "Say what people are actually unhappy about, and why the user's stated angle misses it. Be direct about the mismatch.",
  DONT_BUILD_IT:
    "Say plainly why this is a no. Do not soften it, do not hedge, do not end on an encouraging note. Then name one adjacent thing the same evidence points at.",
  GO_FIND_OUT:
    "Say what is missing rather than guessing. Name what they should go and check.",
};

/** Only what the model needs: id, kind, who it is about, and the words. */
function distill(evidence: Evidence[]): string {
  return evidence
    .slice(0, 60)
    .map((e) => {
      const about =
        e.kind === "complaint" || e.kind === "praise"
          ? ` about ${e.competitorId}${e.theme ? ` (${e.theme})` : ""}`
          : e.kind === "obituary"
            ? ` ${e.name} died of ${e.causeOfDeath}`
            : e.kind === "barrier"
              ? ` ${e.barrier}`
              : "";
      return `[${e.id}] ${e.kind}${about}: "${e.quote.slice(0, 240)}"`;
    })
    .join("\n");
}

export interface ProseResult extends CitationResult {
  degraded: string | null;
}

/**
 * Stage 5b -- the explanation.
 *
 * The one good-model call per run, over evidence the pipeline has already
 * distilled. Note what it is not given: the raw sources, the scores, or any
 * ability to change the verdict. It receives a decision and a pile of quotes,
 * and writes the connection between them.
 *
 * Whatever comes back then goes through `enforceCitations`, which deletes every
 * sentence that cannot be traced. The prompt asks for citations; the pass is
 * what makes it true.
 */
export async function writeProse(
  result: RubricResult,
  evidence: Evidence[],
  wedge: string | undefined,
  model: LanguageModel,
): Promise<ProseResult> {
  const resolvable = new Set(evidence.map((e) => e.id));

  const prompt = [
    `Verdict: ${result.verdict}`,
    `Why the rubric said so: ${result.reason}`,
    VERDICT_INSTRUCTION[result.verdict] ?? "",
    wedge ? `The user's own angle: ${wedge}` : "The user did not state an angle.",
    "",
    "Evidence:",
    distill(evidence),
  ].join("\n");

  try {
    const raw = await model.complete({ system: SYSTEM, prompt, maxTokens: 1024 });
    return { ...enforceCitations(raw, resolvable), degraded: null };
  } catch (error) {
    // A verdict with no prose is still a verdict with its evidence attached.
    return {
      text: "",
      citedIds: [],
      dropped: [],
      degraded: `prose: ${error instanceof Error ? error.message : "failed"}`,
    };
  }
}
