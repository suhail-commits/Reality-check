"use client";

import type { Evidence } from "@rc/shared";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { DOG_DOSSIER, DOG_VALIDATION } from "@/fixtures/sample";
import { EvidenceCard, ProgressBar, Reveal } from "./primitives";

/**
 * The run, as three steps side by side.
 *
 * These were three stacked full-height acts: 768px of padding alone, and a
 * section over four screens tall. But they are one sequence, not three essays.
 * Reading left to right keeps the order intact while making the height the
 * *tallest* column rather than the sum of all three.
 *
 * The evidence column is deliberately the widest. It carries the most content,
 * and a wider measure means each quote wraps to fewer lines -- which shortens
 * the column that sets the height of everything else.
 *
 * The complaint bar is still scrubbed to scroll position rather than triggered
 * on entry, so it reports where you are instead of firing once. That is the
 * progress indicator doing real work rather than decorating.
 */

/** Scrubbed 0-1 progress across an element, via ScrollTrigger. */
function useScrubProgress(ref: React.RefObject<HTMLElement | null>, disabled: boolean): number {
  const [progress, setProgress] = useState(disabled ? 1 : 0);

  useEffect(() => {
    if (disabled || !ref.current) {
      setProgress(1);
      return;
    }

    let trigger: { kill: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !ref.current) return;

      gsap.registerPlugin(ScrollTrigger);
      trigger = ScrollTrigger.create({
        trigger: ref.current,
        start: "top 85%",
        end: "bottom 65%",
        onUpdate: (self) => setProgress(self.progress),
      });
    })();

    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, [ref, disabled]);

  return progress;
}

/**
 * A numbered step head, with the flow line running out to the right.
 *
 * Numbering is earned here rather than decorative: this is a pipeline, and step
 * two genuinely cannot happen before step one. The connecting line is what turns
 * three columns into one process.
 */
function StepHead({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-sage-light)] text-[11px] text-[var(--color-sage)]">
          {index}
        </span>
        <span className="hidden h-px flex-1 bg-gradient-to-r from-[var(--color-sage-light)] to-transparent lg:block" />
      </div>
      <h3 className="text-[1.0625rem] leading-snug font-medium text-balance">{children}</h3>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-caption leading-relaxed text-pretty text-[var(--color-ink-soft)]">
      {children}
    </p>
  );
}

export function Narrative() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const progress = useScrubProgress(ref, reduced);

  const evidence = DOG_DOSSIER.evidence
    .filter((e) => e.kind === "complaint" || e.kind === "praise")
    .slice(0, 5) as Evidence[];

  const ratio = DOG_VALIDATION.scores.complaintRatio;
  const shown = Math.round(ratio * progress * 100);
  const clusters = DOG_DOSSIER.complaintClusters;
  const wedge = DOG_VALIDATION.ideaSpec.statedWedge;

  return (
    <div
      ref={ref}
      className="grid gap-x-10 gap-y-12 border-b border-[var(--color-rule)] px-6 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] lg:px-10 lg:py-14"
    >
      {/* 1 -------------------------------------------------------------- */}
      <Reveal>
        <section>
          <StepHead index={1}>Who already built this?</StepHead>

          <div>
            {DOG_DOSSIER.competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[var(--color-rule)] py-2.5"
              >
                <span className="text-[15px] font-medium">{competitor.name}</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                  {competitor.domain}
                </span>
                {competitor.pricing ? (
                  <span className="ml-auto text-[11px] text-[var(--color-ink-soft)]">
                    {competitor.pricing}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <Note>
            Three products already serve this. Most tools would stop here and call the market
            crowded. Competitors existing is not a reason to say no &mdash; it proves people pay.
          </Note>
        </section>
      </Reveal>

      {/* 2 -------------------------------------------------------------- */}
      <Reveal delay={0.08}>
        <section>
          <StepHead index={2}>What do people say about them?</StepHead>

          <div className="mb-4 flex items-end gap-5">
            <p className="text-[2.75rem] leading-none font-medium tabular-nums text-[var(--color-dont)]">
              {shown}%
            </p>
            <p className="mb-1 max-w-[26ch] text-[11px] leading-snug text-[var(--color-ink-soft)]">
              of everything said about these three products is a complaint rather than praise
            </p>
          </div>

          <ProgressBar
            progress={ratio * progress}
            label="Measured per product, not across the whole search"
          />

          <div className="mt-5 space-y-2.5">
            {evidence.map((row, i) => (
              <EvidenceCard key={row.id} evidence={row} index={i} dense />
            ))}
          </div>

          <Note>
            Praise is collected too, and that matters more than it sounds. No complaints could mean
            users are happy &mdash; or it could mean the search found nothing. Only observed praise
            tells those apart.
          </Note>
        </section>
      </Reveal>

      {/* 3 -------------------------------------------------------------- */}
      <Reveal delay={0.16}>
        <section>
          <StepHead index={3}>Their plan was a nicer app.</StepHead>

          <div className="paper p-4">
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              What they said they would fix
            </p>
            <p className="mt-1.5 text-[15px] leading-snug text-[var(--color-ink-faint)] line-through decoration-[var(--color-dont)] decoration-2">
              {wedge}
            </p>
          </div>

          <p className="mt-6 mb-3 text-[11px] text-[var(--color-ink-faint)]">
            What they actually complain about
          </p>
          <div>
            {clusters.map((cluster) => (
              <div
                key={cluster.theme}
                className="flex items-baseline gap-3 border-b border-[var(--color-rule)] py-2.5"
              >
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                  {cluster.evidenceIds.length}&times;
                </span>
                <span className="text-[15px] leading-snug text-pretty">{cluster.theme}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-[var(--color-ink-faint)]">
                  {cluster.competitorIds.length > 1
                    ? `${cluster.competitorIds.length} products`
                    : "1 product"}
                </span>
              </div>
            ))}
          </div>

          <Note>
            A complaint that recurs across several products is not one bad company. It is a gap in
            the whole category &mdash; and that is the thing worth building against.
          </Note>
        </section>
      </Reveal>
    </div>
  );
}
