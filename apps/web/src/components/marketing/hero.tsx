"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DURATION, EASE, usePrefersReducedMotion } from "@/lib/motion";

const IDEA = "an app for dog walkers";
const CHAR_MS = 55;

/**
 * The one page-load moment.
 *
 * An idea gets typed into the page, then held. Nothing else on this site
 * autoplays; scattering entrance animations across every section is the tell of
 * a page assembled from parts rather than composed.
 *
 * There is deliberately no accent colour anywhere above the fold. The tool has
 * not decided yet, so the page is grey -- which is what makes the flood of
 * colour at the verdict land as an event rather than as decoration.
 */
export function Hero() {
  const reduced = usePrefersReducedMotion();
  const [typed, setTyped] = useState(reduced ? IDEA.length : 0);

  useEffect(() => {
    if (reduced) {
      setTyped(IDEA.length);
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setTyped(index);
      if (index >= IDEA.length) clearInterval(timer);
    }, CHAR_MS);

    return () => clearInterval(timer);
  }, [reduced]);

  const done = typed >= IDEA.length;

  return (
    <section id="top" className="relative flex min-h-[100svh] flex-col justify-center pt-32 pb-20">
      <div className="mx-auto w-full max-w-[76rem] px-6 lg:px-10">
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE.outExpo }}
          className="mb-10 max-w-[42ch] text-body-lg text-[var(--color-ink-soft)]"
        >
          Every other idea validator scores you out of ten and tells you what you hoped to hear.
          This one reads what people actually wrote.
        </motion.p>

        <p className="text-display-1">
          <span className="text-[var(--color-ink-faint)]">&ldquo;</span>
          {IDEA.slice(0, typed)}
          <span
            className={`inline-block w-[0.5ch] translate-y-[-0.08em] bg-[var(--color-ink-faint)] ${
              done ? "animate-caret" : ""
            }`}
            style={{ height: "0.78em" }}
            aria-hidden
          />
          {done ? <span className="text-[var(--color-ink-faint)]">&rdquo;</span> : null}
        </p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={done ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: DURATION.slow, ease: EASE.outExpo, delay: 0.3 }}
          className="mt-16 flex items-center gap-3 text-caption text-[var(--color-ink-faint)]"
        >
          <span className="h-8 w-px bg-gradient-to-b from-transparent to-[var(--color-rule)]" />
          Scroll to watch it decide
        </motion.div>
      </div>
    </section>
  );
}
