import type { Dossier, Scores } from "@rc/shared";
import { EvidenceRow } from "./evidence";

/**
 * The four signals, each with the number, what the number means in plain
 * English, and the evidence underneath it.
 *
 * Expanded with `details`/`summary` rather than state, so these work in a
 * server component and keep working with JavaScript off -- which matters for a
 * page whose whole promise is that the sources are there to check.
 */
function Panel({
  name,
  value,
  reading,
  children,
}: {
  name: string;
  value: string;
  reading: string;
  children?: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] open:bg-[var(--color-paper)]">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-medium tracking-widest text-[var(--color-ink-faint)] uppercase">
          {name}
        </span>
        <span className="ml-auto font-mono text-lg font-semibold tabular-nums">{value}</span>
        <span className="text-[var(--color-ink-faint)] transition group-open:rotate-90" aria-hidden>
          ›
        </span>
      </summary>
      <div className="space-y-4 px-5 pb-5">
        <p className="text-sm text-pretty text-[var(--color-ink-soft)]">{reading}</p>
        {children}
      </div>
    </details>
  );
}

export function SignalGrid({ scores, dossier }: { scores: Scores; dossier: Dossier }) {
  const evidence = dossier.evidence;
  const complaints = evidence.filter((e) => e.kind === "complaint");
  const praise = evidence.filter((e) => e.kind === "praise");
  const obituaries = evidence.filter((e) => e.kind === "obituary");
  const barriers = evidence.filter((e) => e.kind === "barrier");

  const pct = Math.round(scores.complaintRatio * 100);
  const trend =
    scores.trajectory > 0.1 ? "Growing" : scores.trajectory < -0.1 ? "Shrinking" : "Flat";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--color-ink-soft)] uppercase">
        What the four signals said
      </h2>

      <Panel
        name="Are users angry?"
        value={`${pct}%`}
        reading={
          `Of everything said about these ${scores.competitorCount} products, ${pct}% was a complaint rather than praise. ` +
          (scores.praiseVolume > 0
            ? "Praise was found too, so this is a measurement of how people feel, not of how much we managed to read."
            : "Almost no praise was found either, which usually means thin coverage rather than universal anger.")
        }
      >
        <ul className="rounded-lg border border-[var(--color-rule)] px-4 py-3">
          {[...complaints, ...praise].slice(0, 6).map((e, i) => (
            <EvidenceRow key={e.id} evidence={e} index={i + 1} />
          ))}
        </ul>
      </Panel>

      <Panel
        name="Who died here?"
        value={obituaries.length === 0 ? "None" : `${obituaries.length}`}
        reading={
          obituaries.length === 0
            ? "No shutdowns found in this market."
            : scores.recentDemandSideDeaths > 0
              ? `${scores.recentDemandSideDeaths} of these died because the market did not want it or the numbers did not work. That counts against the idea.`
              : "Everything that died here died of execution, or was acquired. That says nothing bad about the idea itself."
        }
      >
        {obituaries.length > 0 ? (
          <ul className="rounded-lg border border-[var(--color-rule)] px-4 py-3">
            {obituaries.map((e, i) => (
              <EvidenceRow key={e.id} evidence={e} index={i + 1} />
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel
        name="Is interest growing?"
        value={trend}
        reading={
          `Measured over the last two years. ` +
          (trend === "Shrinking"
            ? "A shrinking market is the one case where being crowded really is fatal."
            : "A crowded market that is growing is a rising tide, not a closed door.")
        }
      />

      <Panel
        name="Could you actually enter?"
        value={`${Math.round(scores.feasibility)}/100`}
        reading={
          barriers.length === 0
            ? "Nothing here needs a licence, a warehouse or a network of users before it works."
            : `The barriers found were ${barriers
                .map((b) => (b.kind === "barrier" ? b.barrier.replace(/_/g, " ") : ""))
                .filter(Boolean)
                .join(", ")}. Barriers are counted from cited evidence and from the shape of the market, never scored by a model.`
        }
      >
        {barriers.length > 0 ? (
          <ul className="rounded-lg border border-[var(--color-rule)] px-4 py-3">
            {barriers.map((e, i) => (
              <EvidenceRow key={e.id} evidence={e} index={i + 1} />
            ))}
          </ul>
        ) : null}
      </Panel>
    </section>
  );
}
