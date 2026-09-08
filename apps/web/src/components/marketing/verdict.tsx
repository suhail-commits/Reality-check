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
 * Where the example lands.
 *
 * The accent is written onto the enclosing exhibit rather than onto the
 * document, so the colour belongs to the run that produced it. Flooding the
 * whole page would say the *site* had reached a conclusion, which it has not --
 * it is showing you one somebody else got.
 *
 * Everything inside the frame is grey until this point, so the shift still
 * reads as an event, just a correctly scoped one.
 */
export function VerdictReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-30% 0px -30% 0px" });

  const verdict = DOG_VALIDATION.verdict;
  const style = VERDICT_STYLE[verdict];

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
      className="flex flex-col items-center px-6 py-24 text-center lg:px-10 lg:py-32"
    >
      <p className="text-caption text-[var(--color-ink-faint)]">{RULE_NAME[DOG_VALIDATION.firedRule]}</p>

      <h3
        className="text-display-2 mt-8 text-balance transition-colors duration-700"
        style={{ color: inView ? "var(--accent)" : "var(--color-ink-faint)" }}
      >
        {style.label}
      </h3>

      <p className="mt-8 max-w-[44ch] text-body-lg text-balance text-[var(--color-ink-soft)]">
        {style.gloss}
      </p>

      {DOG_VALIDATION.redirect ? (
        <div className="mt-14 flex max-w-[34ch] flex-col items-center gap-4">
          <span className="rounded-full border border-[var(--color-rule)] px-3 py-1 text-caption text-[var(--color-ink-soft)]">
            Where the opening is · {STRENGTH_LABEL[DOG_VALIDATION.redirect.strength].label}
          </span>
          <p className="text-headline text-balance">{DOG_VALIDATION.redirect.theme}</p>
          <p className="text-caption text-[var(--color-ink-soft)]">
            {DOG_VALIDATION.redirect.evidenceIds.length} people said so, across two products.
          </p>
        </div>
      ) : null}

      <div className="mt-14 flex flex-col items-center gap-3">
        <div className="rule-fade w-40" />
        <p className="text-caption text-[var(--color-ink-faint)]">
          Reached by the same rules every time. No AI decided this.
        </p>
      </div>
    </div>
  );
}
