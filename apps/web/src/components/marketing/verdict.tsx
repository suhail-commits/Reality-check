"use client";

import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { DOG_VALIDATION } from "@/fixtures/sample";
import { RULE_NAME, STRENGTH_LABEL, VERDICT_STYLE } from "@/lib/verdict";

const ACCENT_TOKEN: Record<string, string> = {
  BUILD_IT: "var(--color-build)",
  BUILD_IT_DIFFERENTLY: "var(--color-differently)",
  DONT_BUILD_IT: "var(--color-dont)",
  GO_FIND_OUT: "var(--color-findout)",
};

/**
 * Where the run lands, as a band rather than a screen.
 *
 * This was a centred, full-height block: 256px of padding around a stack of
 * five centred elements, roughly 770px to deliver one sentence and its
 * consequence. Centring is what forced the height -- a centred column cannot
 * use the width beside it, so every part has to queue vertically.
 *
 * Read across instead, the same content is two halves of one line: the ruling
 * on the left, where to aim on the right. It reads better that way too, because
 * those two things are a pair rather than a sequence.
 *
 * The accent is still written onto the enclosing exhibit rather than the
 * document, so the colour belongs to the run that produced it.
 */
export function VerdictReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });

  const verdict = DOG_VALIDATION.verdict;
  const style = VERDICT_STYLE[verdict];
  const redirect = DOG_VALIDATION.redirect;

  useEffect(() => {
    const frame = ref.current?.closest<HTMLElement>("[data-exhibit]");
    if (!frame) return;

    frame.style.setProperty("--accent", inView ? (ACCENT_TOKEN[verdict] ?? "") : "");
    return () => {
      frame.style.removeProperty("--accent");
    };
  }, [inView, verdict]);

  return (
    <div
      ref={ref}
      className="grid gap-x-12 gap-y-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-10 lg:py-14"
    >
      <div>
        <p className="text-[11px] text-[var(--color-ink-faint)]">
          {RULE_NAME[DOG_VALIDATION.firedRule]}
        </p>

        <h3
          className="mt-3 text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-medium tracking-[-0.03em] text-balance transition-colors duration-700"
          style={{ color: inView ? "var(--accent)" : "var(--color-ink-faint)" }}
        >
          {style.label}
        </h3>

        <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-pretty text-[var(--color-ink-soft)]">
          {style.gloss}
        </p>

        <p className="mt-6 text-[11px] text-[var(--color-ink-faint)]">
          Reached by the same rules every time. No AI decided this.
        </p>
      </div>

      {redirect ? (
        <div className="paper self-start p-5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-[11px] text-[var(--color-ink-faint)]">Where the opening is</p>
            <span className="rounded-full border border-[var(--color-rule)] px-2 py-0.5 text-[10.5px] text-[var(--color-ink-soft)]">
              {STRENGTH_LABEL[redirect.strength].label}
            </span>
          </div>

          <p className="mt-3 text-[1.0625rem] leading-snug font-medium text-balance">
            {redirect.theme}
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-pretty text-[var(--color-ink-soft)]">
            {redirect.basis}
          </p>
          <p className="mt-2 font-mono text-[10.5px] text-[var(--color-ink-faint)]">
            {redirect.evidenceIds.join("  ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
