import type { Evidence } from "@rc/shared";
import { formatDate, SOURCE_LABEL } from "@/lib/verdict";

const KIND_LABEL: Record<Evidence["kind"], string> = {
  complaint: "Complaint",
  praise: "Praise",
  competitor: "Competitor",
  obituary: "Shut down",
  barrier: "Barrier",
  trend_point: "Trend",
};

const KIND_TONE: Record<Evidence["kind"], string> = {
  complaint: "text-[var(--color-dont)]",
  praise: "text-[var(--color-build)]",
  competitor: "text-[var(--color-ink-soft)]",
  obituary: "text-[var(--color-ink-soft)]",
  barrier: "text-[var(--color-differently)]",
  trend_point: "text-[var(--color-findout)]",
};

function subject(e: Evidence): string | null {
  switch (e.kind) {
    case "complaint":
    case "praise":
      return e.competitorId;
    case "competitor":
      return e.name;
    case "obituary":
      return `${e.name} - ${e.causeOfDeath.replace(/_/g, " ")}`;
    case "barrier":
      return e.barrier.replace(/_/g, " ");
    case "trend_point":
      return e.series;
  }
}

/**
 * One evidence row. The quote and the link are the product -- a claim the user
 * cannot click through to is exactly what every competitor in this category
 * already ships.
 */
export function EvidenceRow({ evidence: e, index }: { evidence: Evidence; index?: number }) {
  const who = subject(e);

  return (
    <li
      id={e.id}
      className="scroll-mt-24 border-t border-[var(--color-rule)] py-4 first:border-t-0 first:pt-0"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
        {index !== undefined ? (
          <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{index}</span>
        ) : null}
        <span className={`font-medium ${KIND_TONE[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
        {who ? <span className="text-[var(--color-ink-soft)]">{who}</span> : null}
        <span className="text-[var(--color-ink-faint)]">
          {SOURCE_LABEL[e.source] ?? e.source} · {formatDate(e.postedAt)}
        </span>
      </div>

      <blockquote className="border-l-2 border-[var(--color-rule)] pl-3 text-[15px] leading-relaxed text-pretty text-[var(--color-ink)]">
        {e.quote}
      </blockquote>

      <a
        href={e.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 inline-block text-xs text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4 transition hover:text-[var(--accent)]"
      >
        {e.url.replace(/^https?:\/\//, "").slice(0, 64)}
      </a>
    </li>
  );
}

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-faint)]">
        Nothing here could be traced to a source, so nothing is shown.
      </p>
    );
  }

  return (
    <ul className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-5 py-4">
      {evidence.map((e, i) => (
        <EvidenceRow key={e.id} evidence={e} index={i + 1} />
      ))}
    </ul>
  );
}
