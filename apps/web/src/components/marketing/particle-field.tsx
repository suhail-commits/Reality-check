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
 * Density and alpha are set for the *occluded* case, not the open one. Because
 * the layer is fixed, its particles hold a fixed set of screen positions -- and
 * below the fold most of those positions sit behind an opaque block: the
 * exhibit panel, every paper card, every sunk surface. Only the ones landing in
 * the gaps are ever seen.
 *
 * Tuned for the hero, where nothing covers it, the field disappears everywhere
 * else. So the count is high enough that a useful number survive the gaps, and
 * the alpha floor is above the visible threshold rather than at it: 0.4 gives a
 * luminance gap of about 53 against ivory, where 0.2 gave 27 and read as blank.
 */
export function ParticleField() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;

  return (
    <Particles
      className="fixed inset-0 z-[2]"
      quantity={160}
      staticity={80}
      ease={70}
      size={1.2}
      color="#5D7A63"
      alphaRange={[0.4, 0.85]}
      vy={-0.012}
    />
  );
}
