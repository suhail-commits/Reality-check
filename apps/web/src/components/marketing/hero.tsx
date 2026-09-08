"use client";

import { motion } from "framer-motion";
import { Particles } from "@/components/magic/particles";
import { DURATION, EASE, usePrefersReducedMotion } from "@/lib/motion";
import { MagneticButton } from "./primitives";

/**
 * The hero is about the product, and only about the product.
 *
 * An earlier version opened with an example idea set at 140px, which read as
 * though the example *was* the company. A landing page has to answer "what is
 * this and why should I care" before it shows anything else; a demonstration is
 * evidence for a claim, and it cannot stand in for making the claim.
 *
 * The illustration behind the words is Magic UI's particle field, and it
 * replaced a hand-drawn brain. The brain was the honest reading of the brief --
 * ideas start in a head -- but a brain built from nodes and edges is precisely
 * the generic neural-network image the brief rules out, and every change that
 * made it less generic made it less like a brain. A slow drift of particles
 * says "thought, forming" without illustrating an organ, and it sits behind
 * type instead of competing with it.
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
       * Sparse and slow. `staticity` high so the field leans toward the cursor
       * rather than chasing it, which is the difference between depth and a toy.
       *
       * The colour and alpha floor are not the library's defaults, and cannot
       * be: those are set for white dots on black. On ivory the same values
       * render below the visible threshold.
       */}
      {!reduced ? (
        <Particles
          className="absolute inset-0"
          quantity={110}
          staticity={70}
          ease={70}
          size={1.2}
          color="#5D7A63"
          alphaRange={[0.35, 0.9]}
          vy={-0.014}
        />
      ) : null}

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
