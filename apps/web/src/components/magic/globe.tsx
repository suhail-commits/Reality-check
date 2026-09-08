"use client";

import createGlobe, { type Arc, type COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Adapted from Magic UI (https://magicui.design/docs/components/globe), which
 * wraps cobe (https://cobe.vercel.app).
 *
 * **Magic UI's source targets cobe 0.6.x and does not compile against 2.x.**
 * The v2 API dropped the `onRender` callback that the published component
 * drives rotation with; rotation now goes through the returned handle's
 * `update()`. So the wrapper below owns its own animation frame instead. This
 * is the library having moved, not a preference.
 *
 * The upgrade is worth it: `arcs` is new in v2, which means the "ideas travel
 * outward" story is drawn as real great-circle paths over real geography rather
 * than faked with SVG curves over an ellipse.
 *
 * Other deviations: `cn()` removed (no shadcn here), `motion/react` imported as
 * `framer-motion`, and every colour retuned to sage on ivory. `dark: 0` is
 * cobe's own light mode, not a hack.
 */

const MOVEMENT_DAMPING = 1400;

/** Where the evidence comes from, and where it ends up. */
const ARCS: Arc[] = [
  { from: [37.7749, -122.4194], to: [51.5072, -0.1276] },
  { from: [51.5072, -0.1276], to: [1.3521, 103.8198] },
  { from: [-33.8688, 151.2093], to: [35.6762, 139.6503] },
  { from: [40.7128, -74.006], to: [-23.5505, -46.6333] },
  { from: [52.52, 13.405], to: [19.076, 72.8777] },
];

export const IVORY_GLOBE: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.28,
  // cobe's light mode: land reads dark-on-light rather than lit-on-black.
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  // Low, so the landmass is texture in the paper rather than a graphic.
  mapBrightness: 1.15,
  mapBaseBrightness: 0.06,
  baseColor: [0.965, 0.973, 0.965], // --color-sage-mist
  markerColor: [0.365, 0.478, 0.388], // --color-sage  #5D7A63
  glowColor: [0.878, 0.898, 0.878], // --color-sage-wash, no bloom
  arcColor: [0.494, 0.608, 0.522], // --color-sage-mid #7E9B85
  arcWidth: 0.35,
  arcHeight: 0.32,
  arcs: ARCS,
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.06 },
    { location: [30.0444, 31.2357], size: 0.04 },
    { location: [39.9042, 116.4074], size: 0.06 },
    { location: [-23.5505, -46.6333], size: 0.06 },
    { location: [40.7128, -74.006], size: 0.07 },
    { location: [51.5072, -0.1276], size: 0.06 },
    { location: [37.7749, -122.4194], size: 0.06 },
    { location: [-33.8688, 151.2093], size: 0.05 },
    { location: [35.6762, 139.6503], size: 0.05 },
  ],
};

export function Globe({
  className = "",
  config = IVORY_GLOBE,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const pointerInteracting = useRef<number | null>(null);

  const r = useMotionValue(0);
  const rs = useSpring(r, { mass: 1, damping: 30, stiffness: 100 });

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => {
      widthRef.current = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvas, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
    });

    // v2 has no onRender hook, so rotation is driven from here.
    let frame = 0;
    const spin = () => {
      // Slow. A globe that turns quickly reads as a loading spinner.
      if (pointerInteracting.current === null) phiRef.current += 0.0026;
      globe.update({
        phi: phiRef.current + rs.get(),
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      });
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);

    const reveal = setTimeout(() => {
      canvas.style.opacity = "1";
    }, 0);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(reveal);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [rs, config]);

  return (
    <div className={`absolute inset-0 mx-auto aspect-square w-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="size-full opacity-0 transition-opacity duration-700"
        onPointerDown={(e) => updatePointerInteraction(e.clientX)}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  );
}
