"use client";

import { useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { setAccent, UNDECIDED } from "@/lib/motion";
import { DOG_VALIDATION } from "@/fixtures/sample";
import { RULE_NAME, VERDICT_STYLE } from "@/lib/verdict";

/**
 * The moment the page is built around.
 *
 * Everything above this point is grey. When this section arrives it writes
 * `--accent` on the document root, and because every glow, hairline highlight
 * and focus ring on the page derives from that one variable, the entire site
 * changes temperature at once -- nav included, ambient gradients included.
 *
 * Scrolling back up releases it. The page is only decided while you are looking
 * at the decision.
 */
const ACCENT_TOKEN: Record<string, string> = {
  BUILD_IT: "var(--color-build)",
  BUILD_IT_DIFFERENTLY: "var(--color-differently)",
  DONT_BUILD_IT: "var(--color-dont)",
  GO_FIND_OUT: "var(--color-findout)",
};

export function VerdictReveal() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-35% 0px -35% 0px" });

  const verdict = DOG_VALIDATION.verdict;
  const style = VERDICT_STYLE[verdict];

  useEffect(() => {
    setAccent(inView ? (ACCENT_TOKEN[verdict] ?? UNDECIDED) : UNDECIDED);
    return () => setAccent(UNDECIDED);
  }, [inView, verdict]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[92svh] flex-col items-center justify-center px-6 py-32 text-center"
    >
      <p className="mb-10 text-caption tracking-wide text-[var(--color-ink-faint)]">
        {RULE_NAME[DOG_VALIDATION.firedRule]}
      </p>

      <h2
        className="text-display-1 text-balance transition-colors duration-700"
        style={{ color: inView ? "var(--accent)" : "var(--color-ink-faint)" }}
      >
        {style.label}
      </h2>

      {DOG_VALIDATION.wedge ? (
        <p className="mt-12 max-w-[24ch] text-headline text-balance text-[var(--color-ink)]">
          {DOG_VALIDATION.wedge}
        </p>
      ) : null}

      <div className="mt-16 flex flex-col items-center gap-3">
        <div className="rule-fade w-40" />
        <p className="font-mono text-caption text-[var(--color-ink-faint)]">
          decided by rule {DOG_VALIDATION.firedRule} · no model involved
        </p>
      </div>
    </section>
  );
}
