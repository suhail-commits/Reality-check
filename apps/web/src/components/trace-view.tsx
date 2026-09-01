"use client";

import type { TraceEvent } from "@rc/shared";
import { SOURCE_LABEL } from "@/lib/verdict";

const STAGE_LABEL: Record<string, string> = {
  interview: "Understanding the idea",
  canonicalize: "Checking what we already know",
  gather: "Reading what people said",
  extract: "Pulling out the claims",
  judge: "Scoring it",
};

function line(e: TraceEvent): { text: string; tone: "stage" | "note" | "warn" | "done" } {
  switch (e.type) {
    case "stage_start":
      return { text: STAGE_LABEL[e.stage] ?? e.stage, tone: "stage" };
    case "stage_end":
      return { text: `done in ${(e.ms / 1000).toFixed(1)}s`, tone: "done" };
    case "adapter_result": {
      const source = SOURCE_LABEL[e.adapter] ?? e.adapter;
      if (e.status === "ok") {
        return { text: `${source} wave ${e.wave} - ${e.items} results`, tone: "note" };
      }
      return { text: `${source} wave ${e.wave} - ${e.status.replace("_", " ")}`, tone: "warn" };
    }
    case "market_matched":
      return { text: `market: ${e.name}`, tone: "note" };
    case "degraded":
      return { text: e.reason, tone: "warn" };
    case "note":
      return { text: e.text, tone: "note" };
    case "verdict":
      return { text: "verdict ready", tone: "done" };
  }
}

const TONE: Record<string, string> = {
  stage: "text-[var(--color-ink)] font-medium",
  note: "text-[var(--color-ink-soft)]",
  warn: "text-[var(--color-differently)]",
  done: "text-[var(--color-ink-faint)]",
};

/**
 * Watching the run happen is the most persuasive thirty seconds of the demo,
 * and it costs almost nothing to build because the pipeline already emits this
 * stream. The degraded and timed-out lines are deliberately not hidden: a
 * source dropping out is normal behaviour here, not an error to apologise for.
 */
export function TraceView({ events, running }: { events: TraceEvent[]; running: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
        {running ? (
          <span className="size-1.5 animate-pulse-dot rounded-full bg-[var(--accent)]" />
        ) : (
          <span className="size-1.5 rounded-full bg-[var(--color-rule)]" />
        )}
        {running ? "Working" : "Run complete"}
      </div>

      <ol className="space-y-1 font-mono text-[13px] leading-relaxed">
        {events.map((e, i) => {
          const { text, tone } = line(e);
          return (
            <li key={i} className={`animate-trace-in ${TONE[tone]}`}>
              <span className="mr-2 text-[var(--color-ink-faint)] select-none">
                {tone === "stage" ? "»" : tone === "warn" ? "!" : "·"}
              </span>
              {text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
