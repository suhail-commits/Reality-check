import type { Dossier, Validation } from "@rc/shared";
import { ConfidencePill } from "./chrome";
import { SignalGrid } from "./signals";
import { EvidenceList } from "./evidence";
import { evidenceById, parseProse, RULE_NAME, VERDICT_STYLE } from "@/lib/verdict";

/**
 * The verdict card.
 *
 * The headline is a sentence, never a score. A number out of ten invites the
 * user to argue with the arithmetic instead of reading the evidence, and it
 * communicates nothing -- 7.5 out of 10 is not a decision.
 */
export function VerdictCard({
  validation,
  dossier,
}: {
  validation: Validation;
  dossier: Dossier;
}) {
  const style = VERDICT_STYLE[validation.verdict];
  const byId = evidenceById(dossier.evidence);
  const citable = new Set(validation.citedEvidenceIds.filter((id) => byId.has(id)));
  const segments = parseProse(validation.prose, citable);

  const cited = validation.citedEvidenceIds
    .map((id) => byId.get(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <article className={`${style.accentClass} space-y-10`}>
      <header className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--color-rule)]" />
          <span className="text-[11px] font-medium tracking-widest text-[var(--color-ink-faint)] uppercase">
            {RULE_NAME[validation.firedRule] ?? "Verdict"}
          </span>
          <span className="h-px flex-1 bg-[var(--color-rule)]" />
        </div>

        <h1
          className={`text-balance text-center text-5xl font-semibold tracking-tight sm:text-6xl ${style.textClass}`}
        >
          {style.label}
        </h1>

        <p className="mx-auto max-w-xl text-center text-lg text-pretty text-[var(--color-ink-soft)]">
          {style.gloss}
        </p>

        <div className="flex justify-center">
          <ConfidencePill
            band={validation.confidence.band}
            returned={validation.confidence.adaptersReturned}
            attempted={validation.confidence.adaptersAttempted}
          />
        </div>
      </header>

      {validation.wedge ? (
        <div className="rounded-xl border-l-2 border-[var(--accent)] bg-[var(--color-paper-sunk)] px-5 py-4">
          <p className="mb-1 text-[11px] font-medium tracking-widest text-[var(--color-ink-faint)] uppercase">
            {validation.verdict === "DONT_BUILD_IT" ? "Where to go instead" : "The wedge"}
          </p>
          <p className="text-lg font-medium text-pretty">{validation.wedge}</p>
        </div>
      ) : null}

      {/*
       * Every sentence here survived the citation pass. Anything the model
       * wrote that could not be traced to an evidence row was dropped before
       * this rendered -- silently, so an uncited claim never reaches the page
       * even wearing a warning label.
       */}
      <section className="space-y-4">
        <p className="text-[17px] leading-[1.75] text-pretty">
          {segments.map((s, i) =>
            s.kind === "text" ? (
              <span key={i}>{s.text}</span>
            ) : (
              <a
                key={i}
                href={`#${s.evidenceId}`}
                className="mx-0.5 rounded-sm bg-[var(--color-paper-sunk)] px-1 align-super text-[10px] font-semibold text-[var(--accent)] no-underline transition hover:bg-[var(--accent)] hover:text-[var(--color-paper)]"
                title="Jump to the source for this claim"
              >
                {s.index}
              </a>
            ),
          )}
        </p>
      </section>

      <SignalGrid scores={validation.scores} dossier={dossier} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--color-ink-soft)] uppercase">
          Every claim above, with its source
        </h2>
        <EvidenceList evidence={cited} />
      </section>
    </article>
  );
}
