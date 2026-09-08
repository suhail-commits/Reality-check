"use client";

import { motion } from "framer-motion";
import React, { useEffect, useId, useRef, useState } from "react";

/**
 * Vendored from Magic UI (https://magicui.design/docs/components/dot-pattern).
 *
 * Deviations from the published source:
 *
 * 1. `cn()` removed and `motion/react` imported as `framer-motion`, matching
 *    what this app already has.
 * 2. **Plain `<circle>` when `glow` is false.** The original always renders
 *    `motion.circle`, and with glow off the `initial`/`animate`/`transition`
 *    props are empty objects -- so it pays for a Framer Motion component per
 *    dot to animate nothing. At the spacing this page uses that is hundreds of
 *    wrapped components hydrating for no visual result. Behaviour is identical;
 *    the cost is not.
 *
 * This replaced a hand-built node lattice. A lattice of connected nodes is the
 * generic neural-network background the brief rules out; a dot field reads as
 * the tooth of the paper, which is what a research page should sit on.
 */
interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
  glow?: boolean;
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className = "",
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const box = containerRef.current.getBoundingClientRect();
        setDimensions({ width: box.width, height: box.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const columns = Math.ceil(dimensions.width / width);
  const dots = Array.from({ length: columns * Math.ceil(dimensions.height / height) }, (_, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      x: col * width + cx + x,
      y: row * height + cy + y,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    };
  });

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-gradient`}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {dots.map((dot) =>
        glow ? (
          <motion.circle
            key={`${dot.x}-${dot.y}`}
            cx={dot.x}
            cy={dot.y}
            r={cr}
            fill={`url(#${id}-gradient)`}
            initial={{ opacity: 0.4, scale: 1 }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1] }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              repeatType: "reverse",
              delay: dot.delay,
              ease: "easeInOut",
            }}
          />
        ) : (
          <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={cr} fill="currentColor" />
        ),
      )}
    </svg>
  );
}
