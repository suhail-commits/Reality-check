"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";
import { DOG_VALIDATION } from "@/fixtures/sample";

const SIGNALS = [
  {
    question: "Are users angry at what exists?",
    value: `${Math.round(DOG_VALIDATION.scores.complaintRatio * 100)}%`,
    detail:
      "Complaints as a share of everything said about each named product. Dividing by whatever a search returned would measure the search, not the market.",
  },
  {
    question: "Who died here, and why?",
    value: "2",
    detail:
      "Cause of death flips the sign. Execution failures say nothing about the market. Two deaths from lack of demand is a wall.",
  },
  {
    question: "Is interest growing or dying?",
    value: DOG_VALIDATION.scores.trajectory > 0 ? "Growing" : "Flat",
    detail:
      "Each series is normalised by its own mean, so subscriber counts and download numbers can be compared at all. A missing series lowers confidence rather than moving the score.",
  },
  {
    question: "Could a small team enter?",
    value: `${Math.round(DOG_VALIDATION.scores.feasibility)}`,
    detail:
      "Barriers come from cited evidence or from the shape of the market. Never from a model's opinion of how hard something looks.",
  },
];

/**
 * The four signals, as a horizontal rail driven by vertical scroll.
 *
 * This is the one place GSAP is doing something Framer could not do as cleanly:
 * pinning a section and translating its contents sideways in proportion to
 * scroll distance, with the card rotation tied to the same progress value so
 * the whole rail moves as one object rather than four animated children.
 *
 * Below `lg` it is a plain vertical stack. A horizontal scroll hijack on a phone
 * fights the gesture people are already making.
 */
export function SignalRail() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !section.current || !track.current) return;

      gsap.registerPlugin(ScrollTrigger);

      /**
       * The rail travels from its left gutter to its right gutter, passing
       * through centre exactly at the midpoint of the scroll.
       *
       * The old distance was `scrollWidth - innerWidth + 96`, measured from the
       * viewport edge. Once the viewport passes the rail's own width -- 1904px,
       * which a 1080p screen reaches at 90% browser zoom -- that goes negative,
       * so the track was shoved off centre and the pin was handed a negative
       * length. Naming the two ends as gutters instead makes the direction fall
       * out of the arithmetic rather than being assumed: when the cards
       * overflow, `travel` is negative and the rail scrolls left to reveal them;
       * when they fit it is positive and the group drifts left to right.
       */
      const mm = gsap.matchMedia(section.current as HTMLElement);
      ctx = mm;

      mm.add("(min-width: 1024px)", () => {
        const el = track.current as HTMLDivElement;

        // Layout geometry, so these stay right once the track is transformed.
        const startX = () => -el.offsetLeft;
        const endX = () => window.innerWidth - el.offsetLeft - el.offsetWidth;
        const travel = () => Math.abs(window.innerWidth - el.offsetWidth);

        // Nothing to move through: skip rather than pin for zero distance.
        if (travel() < 8) return;

        gsap.fromTo(
          el,
          { x: startX },
          {
            x: endX,
            ease: "none",
            scrollTrigger: {
              trigger: section.current,
              start: "top top",
              end: () => `+=${travel()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          },
        );

        gsap.to(".signal-card", {
          rotate: 2,
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${travel()}`,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [reduced]);

  return (
    <section id="method" ref={section} className="relative overflow-hidden py-24 lg:py-0">
      <div className="mx-auto max-w-[76rem] px-6 lg:px-10">
        <p className="text-marker mb-6 lg:pt-36">How it decides</p>
        <h2 className="text-display-2 mb-6 max-w-[18ch] text-balance">
          Four questions, asked the same way every time.
        </h2>
        <p className="mb-12 max-w-[58ch] text-body-lg text-[var(--color-ink-soft)]">
          The answers come from what people have written in public. The decision that follows is
          arithmetic, so the same evidence always produces the same result.
        </p>
      </div>

      <div
        ref={track}
        className="flex flex-col gap-6 px-6 lg:mx-auto lg:w-max lg:flex-row lg:gap-8 lg:px-10 lg:pb-32"
      >
        {SIGNALS.map((signal, i) => (
          <article
            key={signal.question}
            style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (0.5 + (i % 3) * 0.35)}deg)` }}
            className="signal-card paper flex flex-col p-9 hover:paper-lift lg:h-[26rem] lg:w-[29rem]"
          >
            <p className="text-body-lg text-balance">{signal.question}</p>
            <p className="mt-auto pt-10 text-display-2 tabular-nums text-[var(--color-sage)]">
              {signal.value}
            </p>
            <p className="mt-5 text-support text-[var(--color-ink-soft)]">{signal.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
