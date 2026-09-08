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
 * Four levels, in this order: headline, call to action, brain, particles. The
 * brain is third deliberately. It sits in its own column at low contrast and
 * barely moves, so it is read after the words rather than instead of them --
 * and the particle field behind the whole page stays the motion layer.
 *
 * The split is the point: **the particles provide motion, the brain provides
 * meaning.** Two things moving in one viewport compete, and the louder one wins.
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
      className="relative flex min-h-[94svh] flex-col justify-center overflow-hidden pt-36 pb-28"
    >
      {/*
       * Level 3. Its own column so it never sits under the type, held at 60%
       * opacity so it stays quieter than the call to action, and pinned to the
       * page's own grid rather than floating in a box of its own.
       */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] items-center justify-center pr-6 opacity-60 lg:flex lg:pr-10"
        aria-hidden
      >
        <Brain className="w-full max-w-[26rem]" />
      </div>

      <div className="relative mx-auto w-full max-w-[76rem] px-6 lg:px-10">
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
          Reality Check reads what people have actually written about your market and finds the gap
          nobody has closed. If your idea is aimed at it, we say so. If it isn&rsquo;t, we show you
          what is &mdash; and every word links back to the page it came from.
        </motion.p>

        <motion.div {...rise(0.26)} className="mt-14 flex flex-wrap items-center gap-6">
          <MagneticButton href="#try">Check an idea</MagneticButton>
          <span className="text-caption text-[var(--color-ink-faint)]">
            No account. No email. Nothing saved unless you share it.
          </span>
        </motion.div>

        <motion.div
          {...rise(0.4)}
          className="mt-28 flex flex-wrap items-center gap-x-10 gap-y-3 text-caption text-[var(--color-ink-faint)]"
        >
          <span>Every answer ends somewhere you can go</span>
          <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
          <span>We say how sure we are, and why</span>
          <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
          <span>Checked against markets whose outcome we already know</span>
        </motion.div>
      </div>
    </section>
  );
}
