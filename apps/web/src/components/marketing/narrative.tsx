"use client";

import type { Evidence } from "@rc/shared";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { DOG_DOSSIER, DOG_VALIDATION } from "@/fixtures/sample";
import { EvidenceCard, ProgressBar, Reveal } from "./primitives";

/**
 * The pinned narrative.
 *
 * Note the split between the two scroll libraries, which is deliberate and
 * differs from the obvious reading of "GSAP owns the pins":
 *
 *   - The **pinning** is CSS `position: sticky`. It is GPU-cheap, causes no
 *     layout shift, and needs no spacer element. GSAP's pin works by cloning
 *     the element into a generated wrapper, which is exactly the kind of thing
 *     that produces a one-pixel jump at the pin boundary.
 *   - **GSAP ScrollTrigger** owns what it is genuinely better at: scrubbed
 *     numeric progress, tied to position rather than fired once on entry.
 *
 * That keeps the rule the design depends on -- scroll-linked motion is scrubbed,
 * so the motion tells you where you are -- while avoiding the layout shift that
 * would break the 60fps requirement more visibly than any easing choice.
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
        start: "top 70%",
        end: "bottom 60%",
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

function ActHeading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="lg:sticky lg:top-32 lg:self-start">
      <h2 className="text-headline text-balance">{children}</h2>
      {aside ? <div className="mt-8">{aside}</div> : null}
    </div>
  );
}

function Act({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto w-full max-w-[76rem] px-6 py-24 lg:px-10 lg:py-32">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
        {children}
      </div>
    </section>
  );
}

/** Act one: the market is not empty, and that is the first thing worth knowing. */
function WhoBuiltThis() {
  return (
    <Act id="method">
      <ActHeading>Who already built this?</ActHeading>

      <div className="space-y-px">
        {DOG_DOSSIER.competitors.map((competitor, i) => (
          <Reveal key={competitor.id} delay={i * 0.1}>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-[var(--color-rule)] py-6">
              <span className="text-headline">{competitor.name}</span>
              <span className="font-mono text-caption text-[var(--color-ink-faint)]">
                {competitor.domain}
              </span>
              {competitor.pricing ? (
                <span className="ml-auto text-caption text-[var(--color-ink-soft)]">
                  {competitor.pricing}
                </span>
              ) : null}
            </div>
          </Reveal>
        ))}

        <Reveal delay={0.35}>
          <p className="max-w-[52ch] pt-8 text-body-lg text-[var(--color-ink-soft)]">
            Three products already serve this. Most tools would stop here and call the market
            crowded. Competitors existing is not a reason to say no — it proves people pay.
          </p>
        </Reveal>
      </div>
    </Act>
  );
}

/** Act two: the strongest signal, and the one everyone else measures wrong. */
function WhatPeopleSay({ evidence }: { evidence: Evidence[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const progress = useScrubProgress(ref, reduced);

  const ratio = DOG_VALIDATION.scores.complaintRatio;
  const shown = Math.round(ratio * progress * 100);

  return (
    <Act id="evidence">
      <ActHeading
        aside={
          <div className="space-y-6">
            <div>
              <p className="text-display-2 tabular-nums text-[var(--color-dont)]">{shown}%</p>
              <p className="mt-2 max-w-[30ch] text-caption text-[var(--color-ink-soft)]">
                of everything said about these three products is a complaint rather than praise
              </p>
            </div>
            <ProgressBar
              progress={ratio * progress}
              label="Measured per product, not across the whole search"
            />
          </div>
        }
      >
        What do people say about them?
      </ActHeading>

      <div ref={ref} className="space-y-4">
        {evidence.map((row, i) => (
          <EvidenceCard key={row.id} evidence={row} index={i} />
        ))}

        <Reveal delay={0.2}>
          <p className="max-w-[52ch] pt-8 text-body-lg text-[var(--color-ink-soft)]">
            Praise is collected too, and that matters more than it sounds. No complaints could mean
            users are happy — or it could mean the search found nothing. Only observed praise tells
            those apart.
          </p>
        </Reveal>
      </div>
    </Act>
  );
}

/** Act three: where the user's own idea finally enters the calculation. */
function YourAngle() {
  const clusters = DOG_DOSSIER.complaintClusters;
  const wedge = DOG_VALIDATION.ideaSpec.statedWedge;

  return (
    <Act>
      <ActHeading>Your angle was scheduling.</ActHeading>

      <div className="space-y-10">
        <Reveal>
          <div className="glass p-6">
            <p className="text-caption text-[var(--color-ink-faint)]">What you said you would fix</p>
            <p className="mt-3 text-headline text-[var(--color-ink-faint)] line-through decoration-[var(--color-dont)] decoration-2">
              {wedge}
            </p>
          </div>
        </Reveal>

        <div>
          <p className="mb-5 text-caption text-[var(--color-ink-faint)]">
            What they actually complain about
          </p>
          <div className="space-y-px">
            {clusters.map((cluster, i) => (
              <Reveal key={cluster.theme} delay={i * 0.1}>
                <div className="flex items-baseline gap-5 border-b border-[var(--color-rule)] py-5">
                  <span className="font-mono text-caption text-[var(--color-ink-faint)]">
                    {cluster.evidenceIds.length}×
                  </span>
                  <span className="text-body-lg">{cluster.theme}</span>
                  <span className="ml-auto font-mono text-caption text-[var(--color-ink-faint)]">
                    {cluster.competitorIds.length > 1
                      ? `${cluster.competitorIds.length} products`
                      : "1 product"}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2}>
          <p className="max-w-[52ch] text-body-lg text-[var(--color-ink-soft)]">
            A complaint that recurs across several products is not one bad company. It is a gap in
            the whole category — and that is the thing worth building against.
          </p>
        </Reveal>
      </div>
    </Act>
  );
}

export function Narrative() {
  const evidence = DOG_DOSSIER.evidence
    .filter((e) => e.kind === "complaint" || e.kind === "praise")
    .slice(0, 5);

  return (
    <>
      <WhoBuiltThis />
      <WhatPeopleSay evidence={evidence} />
      <YourAngle />
    </>
  );
}
