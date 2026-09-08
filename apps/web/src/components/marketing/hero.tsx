"use client";

import { motion } from "framer-motion";
import { DURATION, EASE, usePrefersReducedMotion } from "@/lib/motion";
import { Constellation } from "./constellation";
import { MagneticButton } from "./primitives";

/**
 * The hero is about the product, and only about the product.
 *
 * An earlier version opened with an example idea set at 140px, which read as
 * though the example *was* the company. A landing page has to answer "what is
 * this and why should I care" before it shows anything else; a demonstration is
 * evidence for a claim, and it cannot stand in for making the claim.
 *
 * Two columns: the words at 58%, the constellation at roughly 36% of the
 * viewport. It is a real focal point rather than a watermark, which is what the
 * previous two attempts got wrong -- a brain drawn as an outline is recognised
 * instantly and then finished, and a background layer alone left the right side
 * of the first screen empty.
 *
 * The constellation does not compete for the headline's job. It carries no
 * text, sits in sage at a fraction of the ink's contrast, and moves slowly
 * enough that the eye settles on the words first and finds the structure
 * second.
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
      <div className="relative mx-auto grid w-full max-w-[76rem] items-center gap-x-16 gap-y-14 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:px-10">
        <div>
          <motion.p {...rise(0)} className="text-marker">
            Idea Reality Check
          </motion.p>

          <motion.h1
            {...rise(0.06)}
            className="text-display-1 mt-8 max-w-[15ch] text-balance"
          >
            Tell us your idea. We&rsquo;ll tell you where it works.
          </motion.h1>

          <motion.p
            {...rise(0.16)}
            className="mt-10 max-w-[54ch] text-body-lg text-[var(--color-ink-soft)]"
          >
            Reality Check reads what people have actually written about your
            market and finds the gap nobody has closed. If your idea is aimed at
            it, we say so. If it isn&rsquo;t, we show you what is &mdash; and
            every word links back to the page it came from.
          </motion.p>

          <motion.div
            {...rise(0.26)}
            className="mt-14 flex flex-wrap items-center gap-6"
          >
            <MagneticButton href="#try">Check an idea</MagneticButton>
            <span className="text-caption text-[var(--color-ink-faint)]">
              No account. No email. Nothing saved unless you share it.
            </span>
          </motion.div>

          <motion.div
            {...rise(0.4)}
            className="mt-20 flex flex-wrap items-center gap-x-10 gap-y-3 text-caption text-[var(--color-ink-faint)]"
          >
            <span>Every answer ends somewhere you can go</span>
            <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
            <span>We say how sure we are, and why</span>
            <span className="hidden h-3 w-px bg-[var(--color-rule)] sm:block" />
            <span>Checked against markets whose outcome we already know</span>
          </motion.div>
        </div>

        <motion.div {...rise(0.22)} className="order-first lg:order-last">
          <Constellation className="mx-auto aspect-[3/4] w-full max-w-[20rem] lg:max-w-none" />
        </motion.div>
      </div>
    </section>
  );
}
