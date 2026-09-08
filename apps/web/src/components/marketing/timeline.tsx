"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

/**
 * An idea displacing the line everyone else is standing on.
 *
 * This was five columns, a progress spine and five little node glyphs. Three
 * things were wrong with it. It was a timeline, which is a way of *listing*
 * stages rather than showing one thing become another. The glyphs were drawn
 * from the same nodes-and-edges vocabulary as the hero and the page background,
 * so the section's illustration was the wallpaper at a smaller size. And the
 * labels carried the whole story while the graphic decorated it.
 *
 * So there is one drawing now, and it is the argument.
 *
 * A dashed line runs the full width: what everyone currently expects. One point
 * on it snags -- something bothers you -- and the snag inverts into a rise. The
 * crown of that rise flattens as it is built, because a `shape` exponent takes
 * the same bump from a round swell to a plateau with a top you could stand on.
 * It then repeats outward at a fixed interval, each copy smaller and later than
 * the last, which is what one person telling another actually looks like. And
 * at the end the whole line lifts: the dashed original stays where it was, the
 * solid one settles above it, and the gap between them is the point. The final
 * stage reads "It changes what everyone else expects", so the expectation line
 * moving is not an illustration of the sentence -- it is the sentence.
 *
 * Nothing here is a node, a card, a panel or a particle. It is one stroke, one
 * dashed reference, one dot, and the area between them.
 *
 * Scroll drives it through a sticky stage rather than a pin, because the
 * section only has to hold still -- it does not need to take the scroll over
 * from the browser the way the signal rail does.
 */

const STAGES = [
  { name: "Thought", note: "Something bothers you." },
  { name: "Idea", note: "It turns into a thing you could build." },
  { name: "Creation", note: "You find out whether anyone else feels it." },
  { name: "Growth", note: "The ones who did start telling other people." },
  { name: "Impact", note: "It changes what everyone else expects." },
] as const;

const SAGE = "93, 122, 99";
/** How far apart each retelling lands, as a share of the width. */
const INTERVAL = 0.132;
const ECHOES = 3;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Smoothstepped 0 -> 1 between two scroll positions. */
function ramp(p: number, a: number, b: number): number {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/**
 * A bump whose crown flattens as `shape` rises: a round swell at 1, a plateau
 * with a flat top by 3. One function covers both "an idea" and "a thing that
 * now exists", which is why creation needs no second shape.
 */
function bump(d: number, w: number, shape: number): number {
  return Math.exp(-(((d / w) ** 2) ** shape));
}

export function IdeaTimeline() {
  const section = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const [stage, setStage] = useState(0);
  /** Where the scroll is, and where the drawing has eased to. */
  const target = useRef(0);
  const shown = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;

    const draw = (p: number) => {
      ctx.clearRect(0, 0, w, h);

      const y0 = h * 0.6;
      const cx = w / 2;
      const full = h * 0.3;

      // The five stages, as overlapping ramps rather than steps.
      const snag = ramp(p, 0, 0.12) * (1 - ramp(p, 0.12, 0.26));
      const rise = ramp(p, 0.15, 0.42);
      const build = ramp(p, 0.4, 0.6);
      const spread = ramp(p, 0.56, 0.86);
      const lift = ramp(p, 0.8, 1);

      const shape = 1 + build * 2.2;
      const width = Math.max(16, w * 0.05);
      const gap = w * INTERVAL;
      // As the norm rises, any one telling of it matters less.
      const damp = 1 - 0.44 * lift;
      const base = y0 - full * 0.42 * lift;

      const field = (x: number) => {
        let d = bump(x - cx, width, shape) * rise;
        d -= bump(x - cx, width * 1.2, 1) * snag * 0.2;

        for (let k = 1; k <= ECHOES; k++) {
          const heard = clamp01((spread - (k - 1) * 0.26) / 0.34);
          if (heard <= 0) break;
          const amp = rise * 0.6 ** k * heard;
          d += (bump(x - (cx + k * gap), width, shape) + bump(x - (cx - k * gap), width, shape)) * amp;
        }
        return d * damp;
      };

      const yAt = (x: number) => base - full * field(x);
      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(0, yAt(0));
        for (let x = 2; x <= w; x += 2) ctx.lineTo(x, yAt(x));
      };

      // What everyone expects, before any of this.
      ctx.setLineDash([2, 7]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${SAGE}, 0.4)`;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(w, y0);
      ctx.stroke();
      ctx.setLineDash([]);

      // The displacement itself, as an area rather than an outline.
      trace();
      ctx.lineTo(w, y0);
      ctx.lineTo(0, y0);
      ctx.closePath();
      ctx.fillStyle = `rgba(${SAGE}, 0.06)`;
      ctx.fill();

      // The line as it now is.
      trace();
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(${SAGE}, 0.9)`;
      ctx.stroke();

      // Where it started. The hairline is the measurement, not decoration.
      const oy = yAt(cx);
      if (rise > 0.02) {
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${SAGE}, 0.26)`;
        ctx.beginPath();
        ctx.moveTo(cx, y0);
        ctx.lineTo(cx, oy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = `rgba(${SAGE}, 0.1)`;
      ctx.beginPath();
      ctx.arc(cx, oy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${SAGE}, 0.95)`;
      ctx.beginPath();
      ctx.arc(cx, oy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    };

    const resize = () => {
      w = wrap.offsetWidth;
      h = wrap.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Assigning canvas.width clears it; under reduced motion nothing repaints.
      if (reduced) draw(1);
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let trigger: { kill: () => void } | undefined;
    let cancelled = false;

    if (reduced) {
      setStage(STAGES.length - 1);
      draw(1);
    } else {
      const loop = () => {
        shown.current += (target.current - shown.current) * 0.12;
        draw(shown.current);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);

      void (async () => {
        const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled || !section.current) return;

        gsap.registerPlugin(ScrollTrigger);
        trigger = ScrollTrigger.create({
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            target.current = self.progress;
            const next = Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length));
            setStage((current) => (current === next ? current : next));
          },
        });
      })();
    }

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      trigger?.kill();
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return (
    <section ref={section} className={reduced ? "relative" : "relative h-[190svh]"}>
      <div className={reduced ? "" : "sticky top-0"}>
        <div className="mx-auto flex min-h-svh w-full max-w-[76rem] flex-col justify-center px-6 py-24 lg:px-10">
          <p className="text-marker text-center">How an idea travels</p>
          <h2 className="text-display-2 mx-auto mt-6 max-w-[16ch] text-center text-balance">
            Every one of them starts the same way.
          </h2>

          <div
            ref={wrapRef}
            className="relative mt-14 h-[clamp(190px,30svh,340px)] w-full"
            aria-hidden
          >
            <canvas ref={canvasRef} className="size-full" />
          </div>

          {/*
            Every stage stays in the document in order, so the sequence is
            readable without the scroll. Only one is visible at a time.
          */}
          <ol className="relative mt-10 h-32">
            {STAGES.map((item, i) => (
              <li
                key={item.name}
                className="absolute inset-x-0 top-0 text-center transition-opacity duration-500 ease-out"
                style={{ opacity: stage === i ? 1 : 0 }}
              >
                <p className="text-display-3">{item.name}</p>
                <p className="mx-auto mt-4 max-w-[40ch] text-support text-[var(--color-ink-soft)]">
                  {item.note}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
