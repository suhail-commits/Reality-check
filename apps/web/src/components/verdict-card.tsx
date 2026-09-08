import type { Dossier, Validation } from "@rc/shared";
import { ConfidencePill } from "./chrome";
import { SignalGrid } from "./signals";
import { EvidenceList, EvidenceRow } from "./evidence";
import {
  evidenceById,
  parseProse,
  RULE_NAME,
  STRENGTH_LABEL,
  VERDICT_STYLE,
} from "@/lib/verdict";

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

      {validation.redirect ? (
        <RedirectBlock redirect={validation.redirect} evidence={dossier.evidence} />
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

/**
 * Where to aim.
 *
 * This is the half of the answer people actually act on, so it carries its own
 * evidence rather than borrowing credibility from the prose above it. The
 * strength label is not decoration: the product always shows an opening, which
 * would be worthless if every one of them sounded equally certain.
 */
function RedirectBlock({
  redirect,
  evidence,
}: {
  redirect: NonNullable<Validation["redirect"]>;
  evidence: Dossier["evidence"];
}) {
  const strength = STRENGTH_LABEL[redirect.strength];
  const backing = redirect.evidenceIds
    .map((id) => evidence.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <section className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-[var(--color-ink-soft)]">Where the opening is</p>
        <span className="rounded-full border border-[var(--color-rule)] px-2.5 py-0.5 text-xs text-[var(--color-ink-soft)]">
          {strength.label}
        </span>
      </div>

      <p className="mt-4 text-2xl font-medium tracking-tight text-pretty">{redirect.theme}</p>
      <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-pretty text-[var(--color-ink-soft)]">
        {redirect.basis}
      </p>
      <p className="mt-2 text-xs text-[var(--color-ink-faint)]">{strength.note}</p>

      {backing.length > 0 ? (
        <details className="group mt-5">
          <summary className="cursor-pointer list-none text-xs text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4 [&::-webkit-details-marker]:hidden">
            {backing.length} {backing.length === 1 ? "source" : "sources"} behind this
          </summary>
          <ul className="mt-3 border-t border-[var(--color-rule)] pt-3">
            {backing.map((e, i) => (
              <EvidenceRow key={e.id} evidence={e} index={i + 1} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
