"use client";

import { Particles } from "@/components/magic/particles";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * The particle layer, for the whole app.
 *
 * Mounted once in the root layout as a single `fixed` viewport-sized canvas
 * rather than per section. That distinction is the whole design: one canvas
 * means one animation loop and a constant particle count no matter how long the
 * page is, where per-section instances would mean a separate loop for each and a
 * cost that grows as the page does.
 *
 * Being fixed also means it does not scroll. The field sits still while content
 * moves over it, which reads as depth -- the page passing in front of something
 * -- rather than as a texture glued to the background.
 *
 * Calmer than the hero's original settings. This now sits behind body copy and
 * evidence quotes, not just behind display type with a lot of air around it, so
 * the alpha ceiling comes down. Cards, the exhibit and the verdict panel all
 * have opaque grounds, so the field shows through the gaps between blocks and
 * never behind the text itself.
 */
export function ParticleField() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;

  return (
    <Particles
      className="fixed inset-0 z-[2]"
      quantity={95}
      staticity={80}
      ease={70}
      size={1}
      color="#5D7A63"
      alphaRange={[0.2, 0.55]}
      vy={-0.012}
    />
  );
}
