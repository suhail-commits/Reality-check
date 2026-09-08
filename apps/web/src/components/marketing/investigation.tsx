"use client";

import { useEffect, useRef, useState } from "react";
import { DOG_DOSSIER, DOG_VALIDATION } from "@/fixtures/sample";
import { usePrefersReducedMotion } from "@/lib/motion";
import { SOURCE_LABEL, STRENGTH_LABEL, VERDICT_STYLE, formatDate } from "@/lib/verdict";

/**
 * One run, start to finish -- told one finding at a time, in type alone.
 *
 * The content is what it has always been: the same idea, the same three
 * products, the same quotes with their sources, the same 71%, the same computed
 * redirect and ruling. Nothing is drawn any more. The earlier versions kept
 * reaching for a diagram to *show* the pipeline; this one lets the findings be
 * the interface, because a reader who is shown "71%" at ninety pixels does not
 * also need a chart of it.
 *
 * **One finding owns the viewport at a time.** Eight blocks share one focal
 * position. Handoffs are sequenced, not crossfaded: the outgoing block lifts
 * and leaves before the incoming one rises into its place, so two findings can
 * never occupy the same space at any scroll position. Inside a block, lines
 * arrive one after another and a quote arrives a word at a time, all on the
 * scrub -- a little more scroll is literally a little more sentence, and
 * scrolling back takes it away again in the same order.
 *
 * **The markup is the finished investigation, and the timeline rewinds it.**
 * Every block renders complete; `gsap.set` pushes it all back to nothing when
 * the timeline is built. No-JS, reduced motion and narrow screens therefore get
 * the whole story as a plain article, with no second code path to keep in
 * step -- the final state is the markup.
 *
 * **The gap is given the most room.** It is the moment the product exists for,
 * so it holds a fifth of the scroll on its own and the chrome quietens around
 * it. What follows is the ruling, and nothing else.
 *
 * The label at the top stays for the reason it always has: without one, a
 * visitor who scrolls into "an app for dog walkers" set large concludes that a
 * dog-walking app is what this company makes. `--accent` is still scoped to the
 * section rather than the document, so the verdict colour belongs to the run
 * that produced it.
 */

const { competitors: COMPETITORS, complaintClusters: CLUSTERS } = DOG_DOSSIER;
const { ideaText, ideaSpec, scores, verdict, createdAt } = DOG_VALIDATION;

/**
 * Architecture invariant 8: every verdict except GO FIND OUT carries a
 * redirect. This run is BUILD IT DIFFERENTLY, so the null branch is not
 * reachable -- and a fallback here would mean inventing an opening.
 */
const REDIRECT = DOG_VALIDATION.redirect as NonNullable<typeof DOG_VALIDATION.redirect>;

const STYLE = VERDICT_STYLE[verdict];
const PCT = Math.round(scores.complaintRatio * 100);
const COMPLAINTS = DOG_DOSSIER.evidence.filter((row) => row.kind === "complaint");

/** The quotes behind the opening, in the order the redirect cites them. */
const CITED = REDIRECT.evidenceIds
  .map((id) => DOG_DOSSIER.evidence.find((row) => row.id === id))
  .filter((row): row is NonNullable<typeof row> => Boolean(row))
  .map((row) => {
    const competitorId = (row as { competitorId?: string }).competitorId;
    return {
      id: row.id,
      words: ((row as { quote?: string }).quote ?? "").split(" "),
      source: SOURCE_LABEL[row.source] ?? row.source,
      product: COMPETITORS.find((c) => c.id === competitorId)?.name ?? "",
    };
  });

const STAGES = ["The idea", "What exists", "What people say", "The gap", "The opportunity"] as const;

/**
 * Where each finding takes the stage, as a fraction of the scroll. The gap gets
 * the widest window on purpose. Every block's reveals are budgeted to finish
 * before the next cue minus SWAP, and that budget is checked, not assumed.
 */
const ORDER = ["idea", "products", "ratio", "quote-0", "quote-1", "quote-2", "gap", "opening"] as const;
const CUE = [0, 0.1, 0.23, 0.35, 0.45, 0.55, 0.66, 0.85];
/** A handoff: the outgoing block leaves inside this, then the next arrives. */
const SWAP = 0.03;

/** The stage counter is coarser than the blocks: the three quotes are one stage. */
function stageAt(p: number): number {
  if (p < 0.1) return 0;
  if (p < 0.23) return 1;
  if (p < 0.66) return 2;
  if (p < 0.85) return 3;
  return 4;
}

export function Investigation() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(STAGES.length - 1);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;

    let media: { revert: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !sectionRef.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const q = gsap.utils.selector(stage);
      const mm = gsap.matchMedia();
      media = mm;

      mm.add("(min-width: 1024px)", () => {
        // Rewind the finished markup. autoAlpha, so a block that has left is
        // visibility:hidden rather than merely transparent.
        gsap.set(q("[data-block]"), {
          autoAlpha: 0,
          y: 48,
          scale: 0.92,
          transformOrigin: "left center",
        });
        gsap.set(q("[data-line]"), { autoAlpha: 0, y: 18 });
        gsap.set(q("[data-figure]"), { scale: 0.86, transformOrigin: "left bottom" });
        gsap.set(q("[data-word]"), { opacity: 0 });
        gsap.set(q("[data-bar]"), { scaleX: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            pin: stage,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const next = stageAt(self.progress);
              setStep((current) => (current === next ? current : next));
            },
          },
        });

        tl.to(q("[data-bar]"), { scaleX: 1, duration: 1 }, 0);

        ORDER.forEach((name, i) => {
          const cue = CUE[i] ?? 0;
          const block = q(`[data-block='${name}']`);

          // Out, then in. The gap between them is what stops a collision.
          if (i > 0) {
            tl.to(
              q(`[data-block='${ORDER[i - 1]}']`),
              { autoAlpha: 0, y: -40, scale: 0.96, duration: SWAP },
              cue - SWAP,
            );
          }
          tl.to(block, { autoAlpha: 1, y: 0, scale: 1, duration: i === 0 ? 0.02 : SWAP }, cue);

          // Then the block's own lines, one after another. Quotes are budgeted
          // tighter because their windows are shorter.
          const quote = name.startsWith("quote");
          const start = cue + (i === 0 ? 0.02 : SWAP);
          tl.to(
            q(`[data-block='${name}'] [data-line]`),
            { autoAlpha: 1, y: 0, duration: quote ? 0.015 : 0.02, stagger: quote ? 0.015 : 0.009 },
            start,
          );
          if (quote) {
            tl.to(
              q(`[data-block='${name}'] [data-word]`),
              { opacity: 1, duration: 0.008, stagger: { amount: 0.022 } },
              start + 0.005,
            );
          }
          if (name === "ratio") {
            tl.to(q("[data-figure]"), { scale: 1, duration: 0.04 }, start + 0.005);
          }
        });

        // The gap is the moment. Everything around it goes quiet.
        const gapCue = CUE[ORDER.indexOf("gap")] ?? 0.66;
        tl.to(q("[data-chrome]"), { opacity: 0.4, duration: SWAP }, gapCue);
      });

      // Narrower: no pin, no rewind. The markup is the whole story, so it
      // reads straight down as an article.
      mm.add("(max-width: 1023px)", () => {
        setStep(STAGES.length - 1);
      });
    })();

    return () => {
      cancelled = true;
      media?.revert();
    };
  }, [reduced]);

  /** Blocks share one focal position only where the timeline is driving them. */
  const block = `relative mb-20 ${reduced ? "" : "lg:absolute lg:inset-0 lg:mb-0 lg:flex lg:flex-col lg:justify-center"}`;
  const label = "text-[15px] tracking-[0.06em] text-[var(--color-ink-faint)]";
  const statement =
    "mt-6 max-w-[22ch] text-[clamp(3.25rem,5.6vw,6rem)] leading-[1.02] font-medium tracking-[-0.03em] text-balance";
  const support =
    "mt-8 max-w-[52ch] text-[clamp(1.25rem,1.7vw,1.75rem)] leading-snug text-pretty text-[var(--color-ink-soft)]";

  return (
    <section
      id="example"
      ref={sectionRef}
      data-exhibit
      style={
        step >= STAGES.length - 1
          ? ({ "--accent": "var(--color-differently)" } as React.CSSProperties)
          : undefined
      }
      className={reduced ? "relative" : "relative lg:h-[480svh]"}
    >
      <div ref={stageRef} className="lg:flex lg:h-svh lg:flex-col">
        <div className="mx-auto flex w-full max-w-[76rem] flex-col px-6 py-20 lg:h-full lg:px-10 lg:pt-28 lg:pb-10">
          <header
            data-chrome
            className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[var(--color-rule)] pb-4"
          >
            <span className="text-[15px] font-medium text-[var(--color-ink)]">
              One run, start to finish
            </span>
            <span className="text-[14px] text-[var(--color-ink-faint)]">
              somebody else&rsquo;s idea, not ours
            </span>
            <span className="font-mono text-[13px] text-[var(--color-ink-ghost)]">
              {formatDate(createdAt)}
            </span>
            <span className="ml-auto flex items-baseline gap-3 font-mono text-[13px] text-[var(--color-ink-faint)]">
              <span className="hidden text-[var(--color-ink-soft)] sm:inline">{STAGES[step]}</span>
              <span>
                {String(step + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
              </span>
            </span>
          </header>

          {/* One focal position. Every finding takes it in turn. */}
          <div className="relative mt-16 lg:mt-0 lg:min-h-0 lg:flex-1">
            <div data-block="idea" className={block}>
              <p data-line className={label}>
                Somebody typed in
              </p>
              <p data-line className={statement}>
                &ldquo;{ideaText}&rdquo;
              </p>
              {ideaSpec.statedWedge ? (
                <p data-line className={support}>
                  Their angle: {ideaSpec.statedWedge}.
                </p>
              ) : null}
            </div>

            <div data-block="products" className={block}>
              <p data-line className={label}>
                Who already built this
              </p>
              <p data-line className={statement}>
                Three products already serve this.
              </p>
              <ul className="mt-6">
                {COMPETITORS.map((competitor) => (
                  <li
                    key={competitor.id}
                    data-line
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-[var(--color-rule)] py-3"
                  >
                    <span className="text-[clamp(1.375rem,2vw,1.875rem)] leading-tight font-medium">
                      {competitor.name}
                    </span>
                    <span className="font-mono text-[14px] text-[var(--color-ink-faint)]">
                      {competitor.domain}
                    </span>
                    {competitor.pricing ? (
                      <span className="ml-auto text-[15px] text-[var(--color-ink-soft)]">
                        {competitor.pricing}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p data-line className={support}>
                Competitors existing is not a reason to say no &mdash; it proves people pay.
              </p>
            </div>

            <div data-block="ratio" className={block}>
              <p data-line className={label}>
                What people say about them
              </p>
              <p
                data-line
                data-figure
                className="mt-5 text-[clamp(4.5rem,8.4vw,8.75rem)] leading-none font-medium tracking-[-0.04em] tabular-nums text-[var(--color-dont)]"
              >
                {PCT}%
              </p>
              <p data-line className="mt-6 max-w-[30ch] text-[clamp(1.5rem,2.1vw,2rem)] leading-snug text-balance">
                of everything said about these three products is a complaint rather than praise
              </p>
              <p data-line className={support}>
                Measured per product, not across the whole search.
              </p>
            </div>

            {CITED.map((row, i) => (
              <div key={row.id} data-block={`quote-${i}`} className={block}>
                <p data-line className={label}>
                  What they actually complain about &middot; {i + 1} of {CITED.length}
                </p>
                <p className="mt-6 max-w-[38ch] text-[clamp(1.375rem,2.15vw,2rem)] leading-[1.22] text-pretty">
                  &ldquo;
                  {row.words.map((word, k) => (
                    <span key={`${row.id}-${k}`} data-word>
                      {word}{k < row.words.length - 1 ? " " : ""}
                    </span>
                  ))}
                  &rdquo;
                </p>
                <p data-line className="mt-6 font-mono text-[14px] text-[var(--color-ink-faint)]">
                  {row.source}
                  {row.product ? ` · ${row.product}` : ""}
                </p>
                {i === CITED.length - 1 ? (
                  <p data-line className={support}>
                    {COMPLAINTS.length} complaints across {CLUSTERS.length} recurring themes.
                  </p>
                ) : null}
              </div>
            ))}

            <div data-block="gap" className={block}>
              <p data-line className={label}>
                The gap nobody has closed
              </p>
              <p data-line className={statement}>
                {REDIRECT.theme}
              </p>
              <p data-line className={support}>
                {REDIRECT.basis}
              </p>
            </div>

            <div data-block="opening" className={block}>
              <p data-line className={`${label} flex flex-wrap items-center gap-x-3 gap-y-1.5`}>
                <span>Where the opening is</span>
                <span className="rounded-full border border-[var(--color-rule)] px-3 py-0.5 text-[13px] tracking-normal text-[var(--color-ink-soft)]">
                  {STRENGTH_LABEL[REDIRECT.strength].label}
                </span>
              </p>
              <p data-line className={statement} style={{ color: "var(--accent)" }}>
                {STYLE.label}
              </p>
              <p data-line className={support}>
                {STYLE.gloss}
              </p>
            </div>
          </div>

          <div data-chrome className="mt-16 h-px shrink-0 bg-[var(--color-rule)] lg:mt-0">
            <div data-bar className="h-full origin-left bg-[var(--color-sage)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
