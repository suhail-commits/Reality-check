"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Smooth scroll, and nothing else.
 *
 * Lenis owns exactly one job: turning wheel input into eased scroll position.
 * It is mounted once, and GSAP's ScrollTrigger is driven from its ticker so the
 * two share a single frame loop. Running both on their own rAF is the usual
 * cause of pinned sections drifting a pixel behind the content.
 *
 * Disabled entirely under reduced motion -- hijacking scroll is the first thing
 * that setting is asking you not to do.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Let ScrollTrigger read Lenis's position rather than the browser's.
    void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
      lenis.on("scroll", ScrollTrigger.update);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
