"use client";

import { useEffect, useState } from "react";

/**
 * Motion tokens, shared by all three animation layers so they agree on timing.
 *
 * The layer boundary matters more than the values: Lenis owns scroll, GSAP owns
 * anything tied to scroll *position* (pins, scrubbed values, the horizontal
 * rail), and Framer owns anything tied to *state* (entrances, hover, counters).
 * Two libraries animating the same property is how scroll pages start to judder.
 */
export const EASE = {
  /** Framer-shaped cubic beziers. */
  outQuart: [0.2, 0, 0, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
};

export const DURATION = {
  fast: 0.18,
  base: 0.42,
  slow: 0.9,
  reveal: 1.2,
};

/**
 * The reveal used for anything entering the page. Blur is doing real work here:
 * it reads as depth-of-field, so cards feel like they are arriving from behind
 * the page rather than sliding around on it.
 */
export const reveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.reveal, ease: EASE.outExpo },
  },
};

/**
 * Whether the visitor asked for less motion.
 *
 * Returns false on the first render so the server and client agree, then
 * settles. Every pinned section and every magnetic hover checks this -- under
 * reduced motion the page becomes a plain stacked document, which is a design
 * in its own right rather than a broken version of this one.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Sets the page-wide accent.
 *
 * The verdict section calls this. Because every glow, hairline highlight and
 * focus ring is derived from `--accent`, one assignment changes the temperature
 * of the entire page -- which is the moment the whole design is built around.
 */
export function setAccent(token: string): void {
  document.documentElement.style.setProperty("--accent", token);
}

export const UNDECIDED = "var(--color-ink-faint)";
