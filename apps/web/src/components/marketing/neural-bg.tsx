"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * The layer under everything.
 *
 * Barely there on purpose: at 0.35 opacity against ivory it reads as texture in
 * the paper rather than as a graphic. You should not notice it until the cursor
 * moves and the whole field shifts a few pixels behind the text, which is where
 * the depth comes from.
 *
 * Cursor tracking writes exactly one transform per animation frame, on a single
 * group. Doing it per node, or on every pointermove event, is how a background
 * layer ends up costing more than the content it sits behind.
 */

const COLUMNS = 7;
const ROWS = 5;
const CELL = 180;

/** A lattice with a fixed, deterministic wobble so it never looks like a grid. */
function useLattice() {
  return useMemo(() => {
    const points: { x: number; y: number }[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const seed = row * COLUMNS + col;
        points.push({
          x: col * CELL + ((seed * 53) % 70) - 35,
          y: row * CELL + ((seed * 37) % 70) - 35,
        });
      }
    }

    const links: [number, number][] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i] as { x: number; y: number };
        const b = points[j] as { x: number; y: number };
        if (Math.hypot(b.x - a.x, b.y - a.y) < CELL * 1.12) links.push([i, j]);
      }
    }
    return { points, links };
  }, []);
}

export function NeuralBackground() {
  const group = useRef<SVGGElement>(null);
  const reduced = usePrefersReducedMotion();
  const { points, links } = useLattice();

  useEffect(() => {
    if (reduced) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (event: PointerEvent) => {
      // A few pixels of travel across the whole viewport. Any more and the
      // background starts competing with the text for attention.
      targetX = (event.clientX / window.innerWidth - 0.5) * 26;
      targetY = (event.clientY / window.innerHeight - 0.5) * 18;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.045;
      currentY += (targetY - currentY) * 0.045;
      if (group.current) {
        group.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        viewBox={`-60 -60 ${COLUMNS * CELL + 60} ${ROWS * CELL + 60}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.35 }}
      >
        <g ref={group} style={{ willChange: "transform" }}>
          <g stroke="var(--color-sage-light)" strokeWidth="0.6" opacity="0.5">
            {links.map(([a, b], i) => {
              const p = points[a] as { x: number; y: number };
              const q = points[b] as { x: number; y: number };
              return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
            })}
          </g>
          <g fill="var(--color-sage-mid)" opacity="0.55">
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i % 4 === 0 ? 2.2 : 1.4} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
