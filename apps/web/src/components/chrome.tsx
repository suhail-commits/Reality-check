import type { ConfidenceBand } from "@rc/shared";
import { CONFIDENCE_GLOSS } from "@/lib/verdict";

/**
 * Everything rendered from `src/fixtures` carries this. The engine does not
 * exist yet, and a demo that quietly presents recorded data as a live run is
 * the same class of dishonesty the product exists to argue against.
 */
export function SampleBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-2.5 py-1 text-[11px] font-medium tracking-wide text-[var(--color-ink-faint)] uppercase"
      title="packages/engine is not built yet. This page renders a recorded run."
    >
      <span className="size-1.5 rounded-full bg-[var(--color-ink-faint)]" />
      Sample data
    </span>
  );
}

export function ConfidencePill({
  band,
  returned,
  attempted,
}: {
  band: ConfidenceBand;
  returned: number;
  attempted: number;
}) {
  const dots = band === "high" ? 3 : band === "medium" ? 2 : 1;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] px-3 py-1 text-xs text-[var(--color-ink-soft)]"
      title={`${CONFIDENCE_GLOSS[band]} ${returned} of ${attempted} sources returned.`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full ${
              i < dots ? "bg-[var(--accent)]" : "bg-[var(--color-rule)]"
            }`}
          />
        ))}
      </span>
      <span className="font-medium capitalize">{band} confidence</span>
      <span className="text-[var(--color-ink-faint)]">
        {returned}/{attempted} sources
      </span>
    </span>
  );
}

/**
 * The cache hit, stated out loud.
 *
 * A threshold set too loose serves a neighbouring market's dossier, and the
 * result is a confident verdict backed by real, clickable citations about the
 * wrong market. The tool is allowed to be wrong. It is not allowed to be
 * silently wrong, so the match is always named and always rejectable.
 */
export function MarketMatch({
  name,
  similarity,
  fresh,
  onReject,
}: {
  name: string;
  similarity: number;
  fresh: boolean;
  onReject?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-4 py-3 text-sm">
      <span className="text-[var(--color-ink-soft)]">
        {fresh ? "Researched as" : "Matched to"}{" "}
        <strong className="font-semibold text-[var(--color-ink)]">{name}</strong>
      </span>
      <span className="text-xs text-[var(--color-ink-faint)]">
        {Math.round(similarity * 100)}% match
      </span>
      {onReject ? (
        <button
          type="button"
          onClick={onReject}
          className="ml-auto rounded-md border border-[var(--color-rule)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--color-ink)]"
        >
          Not my market
        </button>
      ) : null}
    </div>
  );
}
