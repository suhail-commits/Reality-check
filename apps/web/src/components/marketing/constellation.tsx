"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * The hero visual: one idea entering a system, four readings coming back.
 *
 * Everything before this failed the same way. A brain, a tiered constellation,
 * a star chart, a branching route map -- all of them points joined by lines,
 * which a reader files as a diagram within a second regardless of what the
 * points are meant to mean.
 *
 * What changes it is not the geometry, it is that the destinations are named.
 * An unlabelled fan of curves is a chart. The same curves arriving at "High
 * demand", "Adjacent opportunity", "Niche potential" and "Low traction" are a
 * *result* -- the thing the product returns, drawn once. It stops being an
 * illustration of the idea and becomes an instance of it.
 *
 * The paths bundle at the origin and splay outward as braids of four fine
 * strands rather than single lines, so the movement reads as something being
 * separated out -- light through a prism -- instead of something being plotted.
 *
 * Two things were wrong with the first working version, and both were about
 * time rather than drawing:
 *
 * 1. **It took nineteen seconds to say what it had to say.** A reveal that slow
 *    is not a reveal, it is something that happens to people who already
 *    stayed. The whole sequence now completes in 2.5s -- the first path out at
 *    0.3s, the rest arrived by 1.5s, names by 2.0s -- and then stops changing.
 *    What continues afterwards is drift and a slow breath on the strands, which
 *    is ambient rather than narrative: nothing after 2.5s carries information,
 *    so nothing after 2.5s is worth waiting for.
 *
 * 2. **The arrivals sat at a fixed 63% of the width**, which was the narrowest
 *    box's constraint imposed on every box. The names are laid out in DOM to
 *    the right of each node, so the only real limit is how much room the
 *    longest of them needs; `destXFor` reserves exactly that and pushes the
 *    arrivals as deep to the right as the remaining width allows. On a wide
 *    screen the paths now travel most of the panel instead of stopping short in
 *    the middle of it.
 *
 * Points are drawn from one drifting particle field. There is no diagram
 * underneath with particles decorating it: the field is dense along the strands
 * because that is where the strands are, and the structure is what the field
 * settles into within the first two seconds.
 */

type Point = { x: number; y: number };

type Destination = {
  /** Vertical position. The horizontal one is computed from the box width. */
  y: number;
  label: string;
  sub: string;
  /** 0 leads, 1 supports, 2 is the reading nobody wants. */
  rank: 0 | 1 | 2;
  /** Seconds before this braid starts drawing. */
  at: number;
  /** Seconds it takes to arrive. */
  draw: number;
};

const ORIGIN_X = 0.09;
const ORIGIN_Y = 0.5;

/**
 * The primary reading leaves first and alone, so the eye has one thing to
 * follow before it has four. The other three follow in a close stagger -- far
 * enough apart to read as separate findings, close enough that they land as one
 * set.
 */
const DESTINATIONS: readonly Destination[] = [
  { y: 0.12, label: "High demand", sub: "Underserved market", rank: 0, at: 0.3, draw: 0.95 },
  { y: 0.37, label: "Adjacent opportunity", sub: "Related use cases", rank: 1, at: 0.8, draw: 0.6 },
  { y: 0.63, label: "Niche potential", sub: "Smaller but real demand", rank: 1, at: 0.88, draw: 0.6 },
  { y: 0.87, label: "Low traction", sub: "High competition", rank: 2, at: 0.96, draw: 0.56 },
];

/** Nodes at 1.5s, names at 2.0s, finished at 2.5s. */
const T_NODES = 1.5;
const T_LABELS = 2.0;
const T_DONE = 2.5;
/** Scrolling back to the hero replays it quicker, because it is a reminder. */
const REPLAY_SCALE = 0.62;

const SAGE = "93, 122, 99";
const STRANDS = 4;
const SAMPLES = 60;
const DUST = 110;
/**
 * Room kept clear on the right for the names: the widest of them
 * ("Adjacent opportunity", 173px at 17px/600) plus its 20px indent plus air.
 *
 * This constant is what places the arrivals, so it is the reason type size and
 * node position cannot be chosen independently -- setting the names 33% wider
 * spends 32px that used to be path.
 */
const LABEL_RESERVE = 198;

const RANK_ALPHA = [0.62, 0.42, 0.26];

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** As deep to the right as the names allow, never past four fifths. */
function destXFor(w: number): number {
  if (!w) return 0.63;
  return Math.min(0.82, Math.max(0.54, 1 - LABEL_RESERVE / w));
}

/** A braid: several strands to the same reading, each fractionally different. */
function braidsFor(destX: number): Point[][][] {
  const span = destX - ORIGIN_X;

  return DESTINATIONS.map((to) =>
    Array.from({ length: STRANDS }, (_, s) => {
      const spread = (s - (STRANDS - 1) / 2) / (STRANDS - 1);
      const c1x = ORIGIN_X + span * 0.45;
      const c1y = ORIGIN_Y + spread * 0.1;
      const c2x = destX - span * 0.4;
      const c2y = to.y + spread * 0.16;

      return Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const t = i / SAMPLES;
        const u = 1 - t;
        return {
          x: u * u * u * ORIGIN_X + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * destX,
          y: u * u * u * ORIGIN_Y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * to.y,
        };
      });
    }),
  );
}

type Mote = { x: number; y: number; vx: number; vy: number; r: number; a: number };

/**
 * The field. Most of it settles near a strand, because that is where the
 * structure is -- the density is the finding, not a decoration over it.
 */
function seedDust(braids: Point[][][]): Mote[] {
  return Array.from({ length: DUST }, (_, i) => {
    if (i % 3 !== 0) {
      const b = braids[i % braids.length] as Point[][];
      const strand = b[i % STRANDS] as Point[];
      const p = strand[Math.floor(Math.random() * SAMPLES)] as Point;
      return {
        x: p.x + (Math.random() - 0.5) * 0.08,
        y: p.y + (Math.random() - 0.5) * 0.06,
        vx: (Math.random() - 0.5) * 0.000055,
        vy: (Math.random() - 0.5) * 0.000045,
        r: Math.random() < 0.22 ? 1.6 : 1,
        a: 0.18 + Math.random() * 0.36,
      };
    }
    return {
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00004,
      vy: (Math.random() - 0.5) * 0.00004,
      r: Math.random() < 0.15 ? 1.5 : 0.9,
      a: 0.12 + Math.random() * 0.22,
    };
  });
}

export function Constellation({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const [labelsIn, setLabelsIn] = useState(reduced);
  const [destX, setDestX] = useState(0.63);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;
    let dx = 0.63;
    let braids = braidsFor(dx);
    let dust = seedDust(braids);

    // The clock is mutable because scrolling back restarts it, faster.
    let startedAt = performance.now();
    let scale = 1;
    let labelsFired = reduced;

    const resize = () => {
      w = wrap.offsetWidth;
      h = wrap.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // The arrivals move with the width, so the braids -- and the field that
      // clings to them -- are rebuilt rather than stretched.
      const next = destXFor(w);
      if (next !== dx) {
        dx = next;
        braids = braidsFor(dx);
        dust = seedDust(braids);
        setDestX(dx);
      }

      // Assigning canvas.width clears it, and under reduced motion no loop is
      // coming to redraw. Without this, a resize blanks the visual for good.
      if (reduced) draw(999);
    };

    const px = (p: Point) => ({ x: p.x * w, y: p.y * h });

    const draw = (elapsed: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";

      // The field, always present, always drifting.
      for (const d of dust) {
        if (!reduced) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -0.02) d.x = 1.02;
          if (d.x > 1.02) d.x = -0.02;
          if (d.y < -0.02) d.y = 1.02;
          if (d.y > 1.02) d.y = -0.02;
        }
        const p = px(d);
        ctx.fillStyle = `rgba(${SAGE}, ${d.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      DESTINATIONS.forEach((dest, di) => {
        const progress = reduced
          ? 1
          : easeOut(clamp01((elapsed - dest.at * scale) / (dest.draw * scale)));
        if (progress <= 0) return;

        const strands = braids[di] as Point[][];
        const lift = hoveredRef.current === di ? 1.3 : 1;

        // Once everything has arrived the strands breathe. Ambient, not
        // narrative: slow enough that nothing new appears to be happening.
        const settled = elapsed - T_DONE * scale;
        const breath = reduced || settled <= 0 ? 1 : 1 + 0.1 * Math.sin(settled + di * 1.7);
        const base = (RANK_ALPHA[dest.rank] as number) * lift * breath;

        strands.forEach((strand, si) => {
          // Inner strands are the readable ones; outer ones are almost breath.
          const centre = 1 - Math.abs(si - (STRANDS - 1) / 2) / ((STRANDS - 1) / 2);
          ctx.lineWidth = 0.55 + centre * 0.55;
          ctx.strokeStyle = `rgba(${SAGE}, ${(base * (0.3 + centre * 0.7) * 0.7).toFixed(3)})`;

          const last = Math.floor(progress * SAMPLES);
          ctx.beginPath();
          const head = px(strand[0] as Point);
          ctx.moveTo(head.x, head.y);
          for (let i = 1; i <= last; i++) {
            const p = px(strand[i] as Point);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        });

        // The reading itself. It appears on the clock rather than on arrival,
        // so the four of them land together.
        const on = reduced ? 1 : clamp01((elapsed - T_NODES * scale) / (0.35 * scale));
        if (on <= 0) return;

        const p = px({ x: dx, y: dest.y });
        const hot = hoveredRef.current === di;

        ctx.fillStyle = `rgba(${SAGE}, ${(0.09 * on).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (hot ? 26 : 20) * on, 0, Math.PI * 2);
        ctx.fill();

        const solid = (dest.rank === 0 ? 0.95 : 0.78) * on;
        ctx.fillStyle = `rgba(${SAGE}, ${solid.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (dest.rank === 0 ? 5.6 : 4.6) * (hot ? 1.28 : 1), 0, Math.PI * 2);
        ctx.fill();
      });

      // The idea. Present from the start, because it is what arrived.
      const o = px({ x: ORIGIN_X, y: ORIGIN_Y });
      ctx.fillStyle = `rgba(${SAGE}, 0.085)`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${SAGE}, 0.95)`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let observer: IntersectionObserver | undefined;

    if (reduced) {
      draw(999);
    } else {
      const loop = (now: number) => {
        const elapsed = (now - startedAt) / 1000;
        draw(elapsed);
        if (!labelsFired && elapsed >= T_LABELS * scale) {
          labelsFired = true;
          setLabelsIn(true);
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);

      // Scrolling away and back replays a shortened version, so the hero is
      // never a still image on the second visit.
      let away = false;
      observer = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (!e) return;
          if (e.intersectionRatio < 0.05) {
            away = true;
          } else if (away && e.intersectionRatio > 0.4) {
            away = false;
            scale = REPLAY_SCALE;
            startedAt = performance.now();
            labelsFired = false;
            setLabelsIn(false);
          }
        },
        { threshold: [0, 0.05, 0.4] },
      );
      observer.observe(wrap);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className={`pointer-events-none relative ${className}`}>
      <canvas ref={canvasRef} className="size-full" />

      {/* Labels are DOM, not canvas: crisp at any density, and real text. */}
      <span
        className="absolute -translate-x-full -translate-y-1/2 pr-4 text-[15px] font-medium whitespace-nowrap text-[var(--color-ink-soft)]"
        style={{ left: `${ORIGIN_X * 100}%`, top: `${ORIGIN_Y * 100}%` }}
      >
        Your idea
      </span>

      {DESTINATIONS.map((dest, i) => (
        <span
          key={dest.label}
          className="pointer-events-auto absolute -translate-y-1/2 pl-5 transition-opacity duration-500 ease-out"
          style={{
            left: `${destX * 100}%`,
            top: `${dest.y * 100}%`,
            opacity: labelsIn ? 1 : 0,
            transitionDelay: labelsIn ? `${i * 70}ms` : "0ms",
          }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="block text-[17px] leading-tight font-semibold whitespace-nowrap text-[var(--color-ink)]">
            {dest.label}
          </span>
          <span
            className={`mt-1 block text-[13.5px] leading-tight font-medium whitespace-nowrap transition-colors duration-300 ${
              hovered === i ? "text-[var(--color-ink-soft)]" : "text-[var(--color-ink-faint)]"
            }`}
          >
            {dest.sub}
          </span>
        </span>
      ))}
    </div>
  );
}
