"use client";

import { Globe } from "@/components/magic/globe";
import { Reveal } from "./primitives";

/**
 * Where an idea ends up.
 *
 * The globe is Magic UI's, wrapping cobe. It replaced a hand-drawn SVG sphere
 * of latitude and longitude lines, which was the right instinct badly executed:
 * ellipses and arcs look like a *diagram* of a globe. cobe renders real
 * landmasses as dots, so at the sage-on-ivory settings it reads as something
 * printed on the page rather than drawn on it.
 *
 * It is also draggable, which is the only interactive thing on the page and
 * earns its place here -- the section is about reach, and letting someone turn
 * the world is a better argument for that than any amount of copy.
 */
export function WorldImpact() {
  return (
    <section className="mx-auto w-full max-w-[76rem] px-6 py-32 lg:px-10 lg:py-44">
      <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-24">
        <Reveal>
          <div>
            <p className="text-marker">Reach</p>
            <h2 className="text-display-2 mt-6 max-w-[13ch] text-balance">
              An idea does not stay where it started.
            </h2>
            <p className="mt-8 max-w-[46ch] text-body-lg text-[var(--color-ink-soft)]">
              The evidence comes from people writing in public, anywhere. What one person complains
              about in a review is what another builds a company on.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative aspect-square w-full max-w-[34rem] justify-self-center">
            <Globe />
            {/* Grounds the sphere so it sits on the page instead of floating. */}
            <div
              className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-px bg-gradient-to-r from-transparent via-[var(--color-sage-light)] to-transparent"
              aria-hidden
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
