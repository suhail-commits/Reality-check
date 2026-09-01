import type { Dossier, Validation } from "@rc/shared";
import { judge } from "@rc/rubric";
import { extract, findCompetitors } from "./stages/extract.js";
import { gatherBothWaves } from "./stages/gather.js";
import { interview } from "./stages/interview.js";
import { writeProse } from "./stages/prose.js";
import { lexicalSimilarity, type EngineDeps, type Emit, type RunInput, type RunResult } from "./types.js";

const DEFAULT_DEADLINE_MS = 40_000;
/** Deliberately high. A loose match serves the wrong market's dossier. */
const DEFAULT_MATCH_THRESHOLD = 0.6;

let runCounter = 0;
const newId = () => `v_${Date.now().toString(36)}_${(++runCounter).toString(36)}`;

/**
 * The pipeline.
 *
 * Five stages, each emitting typed trace events consumed identically by the CLI
 * and the browser. The shape to notice is where the model appears and where it
 * does not: it reads sources and writes the explanation, and the verdict
 * between those two steps is computed by `packages/rubric` with no model in the
 * call stack at all.
 *
 * Every stage degrades rather than throwing. A dead adapter, an unparseable
 * extraction, a rate-limited prose call -- each costs its own contribution and
 * lowers confidence. The run still ends with a verdict, and the verdict says
 * how much it should be trusted.
 */
export async function run(
  input: RunInput,
  deps: EngineDeps,
  emit: Emit = () => {},
): Promise<RunResult> {
  const similarity = deps.similarity ?? lexicalSimilarity;
  const threshold = deps.matchThreshold ?? DEFAULT_MATCH_THRESHOLD;
  const deadlineMs = deps.gatherDeadlineMs ?? DEFAULT_DEADLINE_MS;
  const now = deps.now();

  const startStage = (s: "interview" | "canonicalize" | "gather" | "extract" | "judge") => {
    const at = deps.now();
    emit({ type: "stage_start", stage: s, at });
    return () => emit({ type: "stage_end", stage: s, at: deps.now(), ms: deps.now().getTime() - at.getTime() });
  };

  // --- 1. Interview -------------------------------------------------------
  let end = startStage("interview");
  const { spec, degraded: interviewDegraded } = await interview(
    input.ideaText,
    input.answers ?? {},
    deps.models.cheap,
  );
  if (interviewDegraded) {
    emit({ type: "degraded", stage: "interview", at: deps.now(), reason: interviewDegraded });
  }
  end();

  // --- 2. Canonicalize ----------------------------------------------------
  end = startStage("canonicalize");
  const existing = await deps.store.list();

  let best: { id: string; name: string; keywords: string[]; score: number } | null = null;
  for (const market of existing) {
    const score = similarity(spec.keywords, market.keywords);
    if (!best || score > best.score) best = { ...market, score };
  }

  const hit = !input.forceFresh && best !== null && best.score >= threshold;
  const market = hit
    ? { id: best!.id, name: best!.name, keywords: best!.keywords }
    : await deps.store.create({ name: spec.problem.slice(0, 80), keywords: spec.keywords });

  // Stated out loud, always. The system may match the wrong market; it may not
  // do so silently, and this event is what the UI renders beside the override.
  emit({
    type: "market_matched",
    at: deps.now(),
    marketId: market.id,
    name: market.name,
    similarity: hit ? (best?.score ?? 0) : 1,
    fresh: !hit,
  });

  const cachedDossier = hit ? await deps.store.dossier(market.id) : null;
  end();

  // --- 3 & 4. Gather and extract, or reuse ------------------------------
  let dossier: Dossier;

  if (cachedDossier) {
    emit({ type: "note", at: deps.now(), text: "Reusing research already done for this market" });
    dossier = cachedDossier;
  } else {
    end = startStage("gather");
    const gathered = await gatherBothWaves(spec, deps.adapters, {
      fetch: deps.fetch,
      now,
      deadlineMs,
      emit,
      findCompetitors: (items) => findCompetitors(items, deps.models.cheap),
    });
    end();

    end = startStage("extract");
    const extracted = await extract(
      gathered.items,
      gathered.competitorNames,
      deps.models.cheap,
      now,
    );
    if (extracted.degraded) {
      emit({ type: "degraded", stage: "extract", at: deps.now(), reason: extracted.degraded });
    }

    const complaints = extracted.evidence.filter((e) => e.kind === "complaint").length;
    const praise = extracted.evidence.filter((e) => e.kind === "praise").length;
    const deaths = extracted.evidence.filter((e) => e.kind === "obituary").length;
    emit({
      type: "note",
      at: deps.now(),
      text: `${complaints} complaints, ${praise} pieces of praise, ${deaths} shutdowns`,
    });
    end();

    dossier = {
      id: `dos_${market.id}`,
      marketId: market.id,
      marketShape: extracted.marketShape,
      competitors: extracted.competitors,
      complaintClusters: [],
      evidence: extracted.evidence,
      gatheredAt: now,
      adapterStatuses: gathered.statuses,
    };
    await deps.store.saveDossier(dossier);
  }

  // --- 5. Judge -----------------------------------------------------------
  end = startStage("judge");
  emit({ type: "note", at: deps.now(), text: "Scoring - no model involved in this step" });

  const result = judge({
    evidence: dossier.evidence,
    competitors: dossier.competitors,
    marketShape: dossier.marketShape,
    adapterStatuses: dossier.adapterStatuses,
    ...(spec.statedWedge ? { statedWedge: spec.statedWedge } : {}),
    now,
  });

  emit({ type: "note", at: deps.now(), text: "Writing the explanation, dropping uncited sentences" });
  const prose = await writeProse(result, dossier.evidence, spec.statedWedge, deps.models.good);
  if (prose.degraded) {
    emit({ type: "degraded", stage: "judge", at: deps.now(), reason: prose.degraded });
  }
  if (prose.dropped.length > 0) {
    emit({
      type: "note",
      at: deps.now(),
      text: `${prose.dropped.length} uncited ${prose.dropped.length === 1 ? "sentence" : "sentences"} removed`,
    });
  }
  end();

  const validation: Validation = {
    id: newId(),
    ideaText: input.ideaText,
    ideaSpec: spec,
    marketId: market.id,
    verdict: result.verdict,
    confidence: result.confidence,
    scores: result.scores,
    firedRule: result.firedRule,
    ...(spec.statedWedge ? { wedge: spec.statedWedge } : {}),
    prose: prose.text,
    citedEvidenceIds: prose.citedIds,
    createdAt: now,
  };

  await deps.store.saveValidation?.(validation, dossier);

  emit({
    type: "verdict",
    at: deps.now(),
    validationId: validation.id,
    verdict: validation.verdict,
  });

  return {
    spec,
    market,
    dossier,
    verdict: validation,
    adapterStatuses: dossier.adapterStatuses,
  };
}
