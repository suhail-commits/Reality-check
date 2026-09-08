"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * The hero centrepiece.
 *
 * Three earlier attempts at a hero visual failed the same way: they were
 * pictures of an idea rather than compositions. A brain outline, however well
 * drawn, is recognised in a quarter of a second and then finished.
 *
 * This is arranged instead of scattered, and the arrangement carries the
 * meaning. Anchors are tiered bottom-left to top-right: many small points low
 * down, converging upward into progressively fewer, larger, better-connected
 * ones. Thoughts, ideas, connections, opportunities -- as the shape of the
 * composition rather than as labels on it. Distance-linked random points, which
 * is how most constellation graphics are built, produce a uniform blob that
 * says nothing.
 *
 * Canvas rather than SVG, because the brief asks for drifting particles that
 * occasionally connect to the structure. Anchors and particles have to share a
 * coordinate space for that to be real rather than staged, and one canvas gives
 * them one.
 *
 * Everything is computed from a normalised layout, so the composition holds its
 * proportions at any size and nothing here depends on the viewport.
 */

type Anchor = { x: number; y: number; tier: number };

/** Normalised 0-1. Hand-placed: a generated layout is the thing to avoid. */
const ANCHORS: readonly Anchor[] = [
  // Thoughts. Many, small, scattered low.
  { x: 0.12, y: 0.95, tier: 0 },
  { x: 0.25, y: 0.9, tier: 0 },
  { x: 0.37, y: 0.97, tier: 0 },
  { x: 0.08, y: 0.82, tier: 0 },
  { x: 0.2, y: 0.79, tier: 0 },
  { x: 0.31, y: 0.85, tier: 0 },
  { x: 0.46, y: 0.92, tier: 0 },
  { x: 0.55, y: 0.83, tier: 0 },
  { x: 0.42, y: 0.76, tier: 0 },
  { x: 0.64, y: 0.89, tier: 0 },
  { x: 0.16, y: 0.7, tier: 0 },
  { x: 0.29, y: 0.67, tier: 0 },
  // Ideas. Fewer, larger, starting to gather.
  { x: 0.22, y: 0.6, tier: 1 },
  { x: 0.38, y: 0.63, tier: 1 },
  { x: 0.51, y: 0.55, tier: 1 },
  { x: 0.33, y: 0.47, tier: 1 },
  { x: 0.6, y: 0.66, tier: 1 },
  { x: 0.68, y: 0.52, tier: 1 },
  { x: 0.46, y: 0.41, tier: 1 },
  { x: 0.75, y: 0.61, tier: 1 },
  // Connections.
  { x: 0.36, y: 0.32, tier: 2 },
  { x: 0.56, y: 0.35, tier: 2 },
  { x: 0.69, y: 0.27, tier: 2 },
  { x: 0.48, y: 0.21, tier: 2 },
  { x: 0.8, y: 0.38, tier: 2 },
  // Opportunities. Three, and they carry the top of the frame.
  { x: 0.53, y: 0.1, tier: 3 },
  { x: 0.71, y: 0.14, tier: 3 },
  { x: 0.4, y: 0.05, tier: 3 },
];

/** Authored, not distance-derived. The graph flows upward and converges. */
const EDGES: readonly [number, number][] = [
  [0, 12], [1, 12], [3, 12], [4, 12], [10, 12],
  [2, 13], [5, 13], [8, 13],
  [6, 14], [7, 14], [9, 16],
  [11, 15], [8, 15],
  [12, 13], [13, 14], [14, 17],
  [12, 20], [15, 20], [13, 20],
  [14, 21], [18, 21], [16, 21],
  [17, 22], [19, 22], [18, 23],
  [20, 21], [21, 22],
  [20, 27], [23, 25], [21, 25],
  [22, 26], [24, 26], [25, 26], [23, 27],
];

const TIER_RADIUS = [1.5, 2.3, 3.1, 4.2];
const TIER_ALPHA = [0.4, 0.55, 0.72, 0.9];

const SAGE = "93, 122, 99"; // #5D7A63
const DRIFTERS = 18;
/** How close a drifting particle must come before it attaches. */
const ATTACH = 46;

type Drifter = { x: number; y: number; vx: number; vy: number; alpha: number };

export function Constellation({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;
    let drifters: Drifter[] = [];

    const resize = () => {
      w = wrap.offsetWidth;
      h = wrap.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drifters = Array.from({ length: DRIFTERS }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.06,
        // Upward, always. The composition reads bottom to top.
        vy: -(0.05 + Math.random() * 0.07),
        alpha: 0.25 + Math.random() * 0.3,
      }));
    };

    const at = (a: Anchor) => ({ x: a.x * w, y: a.y * h });

    const draw = (seconds: number) => {
      ctx.clearRect(0, 0, w, h);

      // Structure first, so nodes sit on top of their own edges.
      ctx.lineWidth = 0.8;
      for (const [i, j] of EDGES) {
        const a = at(ANCHORS[i] as Anchor);
        const b = at(ANCHORS[j] as Anchor);
        // Higher edges are slightly more present, so the eye travels upward.
        const lift = 1 - (ANCHORS[i] as Anchor).y * 0.45;
        ctx.strokeStyle = `rgba(${SAGE}, ${(0.17 * lift).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Drifters, and the moment one attaches to the structure.
      ctx.lineWidth = 0.7;
      for (const d of drifters) {
        if (!reduced) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.y < -8) {
            d.y = h + 8;
            d.x = Math.random() * w;
          }
          if (d.x < -8) d.x = w + 8;
          if (d.x > w + 8) d.x = -8;
        }

        let nearest: { x: number; y: number } | null = null;
        let best = ATTACH;
        for (const anchor of ANCHORS) {
          const p = at(anchor);
          const dist = Math.hypot(p.x - d.x, p.y - d.y);
          if (dist < best) {
            best = dist;
            nearest = p;
          }
        }

        if (nearest) {
          // Fades as it approaches and as it leaves: a brief association.
          const strength = (1 - best / ATTACH) * 0.42;
          ctx.strokeStyle = `rgba(${SAGE}, ${strength.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(nearest.x, nearest.y);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${SAGE}, ${d.alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Anchors. A slow breath, staggered so they never pulse together.
      ANCHORS.forEach((anchor, i) => {
        const p = at(anchor);
        const breath = reduced ? 0 : Math.sin(seconds * 0.42 + i * 1.7) * 0.5 + 0.5;
        const radius = (TIER_RADIUS[anchor.tier] as number) * (1 + breath * 0.09);
        const alpha = (TIER_ALPHA[anchor.tier] as number) * (0.82 + breath * 0.18);

        // The largest tier gets a soft ring: an idea that found its shape.
        if (anchor.tier === 3) {
          ctx.strokeStyle = `rgba(${SAGE}, ${(0.22 * (0.7 + breath * 0.3)).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 5.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${SAGE}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    if (reduced) {
      draw(0);
    } else {
      const loop = (now: number) => {
        draw(now / 1000);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className={`pointer-events-none relative ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
