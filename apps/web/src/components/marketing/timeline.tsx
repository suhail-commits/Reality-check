"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Thought becoming impact.
 *
 * The glyphs are the argument. Each stage is drawn from the same nodes and
 * connections as the brain in the hero and the globe further down, so the three
 * illustrations read as one continuous thing growing rather than as three
 * unrelated decorations: one neuron, then a firing pair, then a cluster, then a
 * network, then a sphere.
 *
 * Activation is scrubbed to scroll position rather than triggered on entry, so
 * scrolling back up walks the sequence backwards. A stage that lights once and
 * stays lit is decoration; one that tracks where you are is an explanation.
 */

const STAGES = [
  { name: "Thought", note: "Something bothers you." },
  { name: "Idea", note: "It turns into a thing you could build." },
  { name: "Creation", note: "You find out whether anyone else feels it." },
  { name: "Growth", note: "The ones who did start telling other people." },
  { name: "Impact", note: "It changes what everyone else expects." },
] as const;

/** One glyph per stage, drawn from the same vocabulary as the brain. */
function Glyph({ stage, active }: { stage: number; active: boolean }) {
  const stroke = active ? "var(--color-sage)" : "var(--color-sage-light)";
  const fill = active ? "var(--color-sage)" : "var(--color-sage-light)";

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-14 w-14 transition-opacity duration-700"
      style={{ opacity: active ? 1 : 0.4 }}
      aria-hidden
    >
      <g stroke={stroke} strokeWidth="1.1" fill="none">
        {stage >= 1 && <line x1="32" y1="32" x2="46" y2="20" />}
        {stage >= 2 && (
          <>
            <line x1="32" y1="32" x2="18" y2="22" />
            <line x1="32" y1="32" x2="20" y2="44" />
          </>
        )}
        {stage >= 3 && (
          <>
            <line x1="46" y1="20" x2="50" y2="38" />
            <line x1="20" y1="44" x2="36" y2="50" />
            <line x1="36" y1="50" x2="50" y2="38" />
          </>
        )}
        {stage >= 4 && <circle cx="32" cy="32" r="26" opacity="0.75" />}
        {stage >= 4 && <ellipse cx="32" cy="32" rx="26" ry="9" opacity="0.6" />}
      </g>

      <g fill={fill}>
        <circle cx="32" cy="32" r={stage === 0 ? 4 : 3} />
        {stage >= 1 && <circle cx="46" cy="20" r="2.4" />}
        {stage >= 2 && (
          <>
            <circle cx="18" cy="22" r="2.4" />
            <circle cx="20" cy="44" r="2.4" />
          </>
        )}
        {stage >= 3 && (
          <>
            <circle cx="50" cy="38" r="2.4" />
            <circle cx="36" cy="50" r="2.4" />
          </>
        )}
      </g>
    </svg>
  );
}

export function IdeaTimeline() {
  const section = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !section.current) {
      setProgress(1);
      return;
    }

    let trigger: { kill: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !section.current) return;

      gsap.registerPlugin(ScrollTrigger);
      trigger = ScrollTrigger.create({
        trigger: section.current,
        start: "top 78%",
        end: "bottom 55%",
        onUpdate: (self) => setProgress(self.progress),
      });
    })();

    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, [reduced]);

  // How far along the spine the light has travelled.
  const reached = progress * STAGES.length;

  return (
    <section
      ref={section}
      className="mx-auto w-full max-w-[76rem] px-6 py-32 lg:px-10 lg:py-44"
    >
      <p className="text-marker">How an idea travels</p>
      <h2 className="text-display-2 mt-6 max-w-[16ch] text-balance">
        Every one of them starts the same way.
      </h2>

      <div className="relative mt-24">
        {/* The spine, lit as far as you have scrolled. */}
        <div className="absolute top-7 right-0 left-0 hidden h-px bg-[var(--color-sage-wash)] lg:block">
          <div
            className="h-full bg-[var(--color-sage)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>

        <ol className="grid gap-14 lg:grid-cols-5 lg:gap-8">
          {STAGES.map((stage, i) => {
            const active = reached > i;
            return (
              <li key={stage.name} className="relative">
                <div className="relative z-10 -mt-7 mb-6 flex justify-start bg-[var(--color-paper)] pr-4 lg:pt-0">
                  <Glyph stage={i} active={active} />
                </div>

                <p
                  className="text-headline transition-colors duration-700"
                  style={{ color: active ? "var(--color-ink)" : "var(--color-ink-faint)" }}
                >
                  {stage.name}
                </p>
                <p
                  className="mt-3 max-w-[24ch] text-caption transition-opacity duration-700"
                  style={{
                    color: "var(--color-ink-soft)",
                    opacity: active ? 1 : 0.45,
                  }}
                >
                  {stage.note}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
