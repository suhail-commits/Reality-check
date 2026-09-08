"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * Where an idea starts.
 *
 * Hand-placed rather than generated: a seeded random cloud is a different shape
 * on the server than in the browser, and the fix for that costs more than
 * writing thirty coordinates. Hand-placing also means the silhouette actually
 * reads as a brain instead of as a point cloud that happens to be roundish.
 *
 * Everything here is SVG with CSS keyframes. No canvas, no per-frame
 * JavaScript, nothing animated except `opacity`, `transform` and
 * `stroke-dashoffset` -- so the whole illustration is composited on the GPU and
 * costs the main thread nothing while the page scrolls.
 */

const NODES: readonly [number, number][] = [
  // Outer contour, roughly a profile.
  [120, 80], [170, 62], [225, 58], [275, 68], [315, 92], [340, 128], [348, 170],
  [338, 212], [312, 246], [272, 268], [228, 278], [186, 272], [150, 256],
  [124, 232], [104, 200], [96, 166], [100, 128],
  // Interior folds.
  [160, 110], [210, 98], [258, 108], [295, 134], [300, 180], [280, 216],
  [240, 236], [196, 232], [162, 208], [140, 172], [150, 140], [200, 150],
  [245, 158], [215, 190], [255, 196],
];

/** Connect anything close enough to look like a fold, not a web. */
const LINK_DISTANCE = 62;

function useConnections() {
  return useMemo(() => {
    const links: { a: number; b: number; length: number }[] = [];
    for (let i = 0; i < NODES.length; i++) {
      for (let j = i + 1; j < NODES.length; j++) {
        const [ax, ay] = NODES[i] as [number, number];
        const [bx, by] = NODES[j] as [number, number];
        const length = Math.hypot(bx - ax, by - ay);
        if (length <= LINK_DISTANCE) links.push({ a: i, b: j, length });
      }
    }
    return links;
  }, []);
}

/** Ideas leaving the brain. Staggered so they never pulse in unison. */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x: 130 + ((i * 47) % 200),
  y: 90 + ((i * 31) % 150),
  dx: `${-30 + ((i * 23) % 70)}px`,
  dy: `${-180 - ((i * 37) % 160)}px`,
  delay: (i * 1.05) % 14,
  r: i % 3 === 0 ? 2.4 : 1.6,
}));

export function Brain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const connections = useConnections();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The brain wakes as you arrive and recedes as you leave. One value drives
  // both, so the whole illustration moves as a single object.
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0.18]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <div ref={ref} className={`pointer-events-none select-none ${className}`} aria-hidden>
      <motion.svg
        viewBox="0 0 440 360"
        fill="none"
        className="h-full w-full overflow-visible"
        style={reduced ? undefined : { opacity, scale, y: lift }}
      >
        <defs>
          <radialGradient id="brain-wash" cx="48%" cy="42%" r="62%">
            <stop offset="0%" stopColor="var(--color-sage-mist)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-sage-mist)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="222" cy="168" rx="168" ry="140" fill="url(#brain-wash)" />

        {/* Folds. Quiet enough to read as structure rather than as a diagram. */}
        <g stroke="var(--color-sage-light)" strokeWidth="0.75" opacity="0.55">
          {connections.map(({ a, b }) => {
            const [ax, ay] = NODES[a] as [number, number];
            const [bx, by] = NODES[b] as [number, number];
            return <line key={`${a}-${b}`} x1={ax} y1={ay} x2={bx} y2={by} />;
          })}
        </g>

        {/* Signals. Only a handful travel at once, so it reads as thought. */}
        <g stroke="var(--color-sage)" strokeWidth="1.6" strokeLinecap="round">
          {connections
            .filter((_, i) => i % 7 === 0)
            .map(({ a, b, length }, i) => {
              const [ax, ay] = NODES[a] as [number, number];
              const [bx, by] = NODES[b] as [number, number];
              return (
                <line
                  key={`sig-${a}-${b}`}
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  className="animate-signal"
                  style={
                    {
                      strokeDasharray: `${length * 0.32} ${length}`,
                      "--len": length,
                      animationDelay: `${(i * 0.83) % 6}s`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
        </g>

        {/* Neurons. */}
        <g fill="var(--color-sage)">
          {NODES.map(([x, y], i) => (
            <circle
              key={`n-${i}`}
              cx={x}
              cy={y}
              r={2}
              className="animate-neuron"
              style={{ animationDelay: `${(i * 0.37) % 5.5}s` }}
            />
          ))}
        </g>

        {/*
         * Ideas. They leave from inside the brain and rise out of frame --
         * which is the whole argument of the page in one gesture.
         */}
        <g fill="var(--color-sage-mid)">
          {PARTICLES.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.r}
              className="animate-drift"
              style={
                {
                  "--dx": p.dx,
                  "--dy": p.dy,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      </motion.svg>
    </div>
  );
}
