"use client";

import { motion } from "framer-motion";
import { DURATION, EASE, usePrefersReducedMotion } from "@/lib/motion";
import { Brain } from "./brain";
import { MagneticButton } from "./primitives";

/**
 * The hero is about the product, and only about the product.
 *
 * An earlier version opened with an example idea set at 140px, which read as
 * though the example *was* the company. A landing page has to answer "what is
 * this and why should I care" before it shows anything else; a demonstration is
 * evidence for a claim, and it cannot stand in for making the claim.
 *
 * The brain sits beside the words rather than behind them. Behind, it competes
 * with the headline for the same pixels and both lose; beside, it reads as the
 * subject of the sentence -- ideas start here, and by the bottom of the page
 * they have reached the globe.
 */
export function Hero() {
  const reduced = usePrefersReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 18, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: DURATION.reveal, ease: EASE.outExpo, delay },
        };

  return (
    <section
      id="top"
      className="relative flex min-h-[94svh] flex-col justify-center pt-36 pb-28"
    >
      <div className="mx-auto grid w-full max-w-[76rem] items-center gap-16 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20 lg:px-10">
        <div>
          <motion.p {...rise(0)} className="text-marker">
            Idea Reality Check
          </motion.p>

          <motion.h1 {...rise(0.06)} className="text-display-1 mt-8 max-w-[15ch] text-balance">
            Tell us your idea. We&rsquo;ll tell you where it works.
          </motion.h1>

          <motion.p
            {...rise(0.16)}
            className="mt-10 max-w-[54ch] text-body-lg text-[var(--color-ink-soft)]"
          >
            Reality Check reads what people have actually written about your market and finds the
            gap nobody has closed. If your idea is aimed at it, we say so. If it isn&rsquo;t, we
            show you what is &mdash; and every word links back to the page it came from.
          </motion.p>

          <motion.div {...rise(0.26)} className="mt-14 flex flex-wrap items-center gap-6">
            <MagneticButton href="#try">Check an idea</MagneticButton>
            <span className="text-caption text-[var(--color-ink-faint)]">
              No account. No email. Nothing saved unless you share it.
            </span>
          </motion.div>
        </div>

        <motion.div
          {...rise(0.2)}
          className="relative order-first aspect-square w-full lg:order-last"
        >
          <Brain className="absolute inset-0" />
        </motion.div>
      </div>

      <motion.div
        {...rise(0.4)}
        className="mx-auto mt-24 flex w-full max-w-[76rem] flex-wrap items-center gap-x-10 gap-y-3 px-6 text-caption text-[var(--color-ink-faint)] lg:px-10"
      >
        <span>Every answer ends somewhere you can go</span>
        <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
        <span>We say how sure we are, and why</span>
        <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
        <span>Checked against markets whose outcome we already know</span>
      </motion.div>
    </section>
  );
}
