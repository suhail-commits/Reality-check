"use client";

import React, { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

/**
 * Vendored from Magic UI (https://magicui.design/docs/components/particles).
 *
 * Deviations: `cn()` removed (no shadcn here), and the container is marked
 * `aria-hidden` as shipped.
 *
 * Why this and not a hand-drawn brain: a brain silhouette built from nodes and
 * edges is the exact "generic neural network" image the brief rules out, and
 * every attempt to make it not look like that makes it look less like a brain.
 * A drifting field of particles carries the same idea -- thought, forming --
 * without illustrating an organ.
 *
 * It also earns its keep behaviourally: the field leans toward the cursor
 * (`staticity` sets how much), so it restores the pointer-reactive depth that
 * the static dot pattern gives up.
 */

/**
 * Cursor position in a ref, not in state.
 *
 * The published component holds it in `useState`, so every mousemove event
 * re-renders the component -- roughly sixty React renders a second while the
 * pointer is moving. That is tolerable for one hero-sized instance and is not
 * tolerable for a layer mounted across the whole app, which is what this is now.
 *
 * The animation loop already runs every frame and can simply read the latest
 * value, so the render is pure waste. One listener, one ref write, no renders.
 */
function useMouseRef() {
  const position = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      position.current.x = event.clientX;
      position.current.y = event.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return position;
}

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
  /**
   * Added to the vendored source. The original hardcodes an alpha range of
   * 0.1-0.7, which is tuned for white dots on black. Sage on ivory at 0.3
   * resolves to about rgb(213,221,212) against rgb(250,249,246) -- a rounding
   * error, not a particle. Light grounds need a higher floor.
   */
  alphaRange?: [number, number];
  /**
   * Added to the vendored source: let some particles gather.
   *
   * A few invisible attractors drift on very slow sine paths, and a minority of
   * particles feel a weak pull toward the nearest one. They loosely group, the
   * ones that end up close enough get a faint line between them, and then the
   * attractor moves on and the group dissolves.
   *
   * The restraint is the whole design. Only a minority of particles take part,
   * the pull is small enough to take tens of seconds to read, the link distance
   * is short so links stay rare, and the line alpha is a fraction of the dot
   * alpha. Link every particle to every neighbour and this becomes the
   * constellation background on a thousand other sites.
   */
  cluster?: boolean;
  /** How many gathering points. Few, so a cluster means something. */
  clusterCount?: number;
  /** Particles stop being pulled inside this radius, so groups stay loose. */
  clusterRadius?: number;
  /** Beyond this, two clustered particles are not related. */
  linkDistance?: number;
  /** Ceiling on line opacity. Deliberately far below the dots'. */
  linkAlpha?: number;
}

function hexToRgb(hex: string): number[] {
  let value = hex.replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const int = parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
  /** Whether this one is drawn to the gathering points. A minority are. */
  social: boolean;
};

export const Particles: React.FC<ParticlesProps> = ({
  className = "",
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  alphaRange = [0.1, 0.7],
  cluster = false,
  clusterCount = 3,
  clusterRadius = 110,
  linkDistance = 72,
  linkAlpha = 0.45,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mousePointer = useMouseRef();
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const rafID = useRef<number | null>(null);
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initCanvasRef = useRef<() => void>(() => {});
  const onMouseMoveRef = useRef<() => void>(() => {});
  const animateRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (canvasRef.current) context.current = canvasRef.current.getContext("2d");
    initCanvasRef.current();
    animateRef.current();

    const handleResize = () => {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(() => initCanvasRef.current(), 200);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      if (rafID.current != null) window.cancelAnimationFrame(rafID.current);
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [color]);

  useEffect(() => {
    initCanvasRef.current();
  }, [refresh]);

  const circleParams = (): Circle => ({
    x: Math.floor(Math.random() * canvasSize.current.w),
    y: Math.floor(Math.random() * canvasSize.current.h),
    translateX: 0,
    translateY: 0,
    size: Math.floor(Math.random() * 2) + size,
    alpha: 0,
    targetAlpha: parseFloat(
      (Math.random() * (alphaRange[1] - alphaRange[0]) + alphaRange[0]).toFixed(2),
    ),
    dx: (Math.random() - 0.5) * 0.1,
    dy: (Math.random() - 0.5) * 0.1,
    magnetism: 0.1 + Math.random() * 4,
    /*
     * A tenth. This was a third, which simulated to 1,200 lines on screen --
     * three tight groups where nearly every pair falls inside the link
     * distance, which is exactly the constellation background this was meant
     * not to be. It only looked acceptable because the lines were too faint to
     * see. At a tenth it settles around 18 links, which reads as a few things
     * connecting.
     */
    social: Math.random() < 0.1,
  });

  const rgb = hexToRgb(color);

  const drawCircle = (circle: Circle, update = false) => {
    if (!context.current) return;
    const { x, y, translateX, translateY, size: s, alpha } = circle;
    context.current.translate(translateX, translateY);
    context.current.beginPath();
    context.current.arc(x, y, s, 0, 2 * Math.PI);
    context.current.fillStyle = `rgba(${rgb.join(", ")}, ${alpha})`;
    context.current.fill();
    context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!update) circles.current.push(circle);
  };

  const clearContext = () => {
    context.current?.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
  };

  const drawParticles = () => {
    clearContext();
    for (let i = 0; i < quantity; i++) drawCircle(circleParams());
  };

  const resizeCanvas = () => {
    if (!canvasContainerRef.current || !canvasRef.current || !context.current) return;
    canvasSize.current.w = canvasContainerRef.current.offsetWidth;
    canvasSize.current.h = canvasContainerRef.current.offsetHeight;

    canvasRef.current.width = canvasSize.current.w * dpr;
    canvasRef.current.height = canvasSize.current.h * dpr;
    canvasRef.current.style.width = `${canvasSize.current.w}px`;
    canvasRef.current.style.height = `${canvasSize.current.h}px`;
    context.current.scale(dpr, dpr);

    circles.current = [];
    for (let i = 0; i < quantity; i++) drawCircle(circleParams());
  };

  const initCanvas = () => {
    // Only resizeCanvas. The published version calls drawParticles() as well,
    // and both push `quantity` circles -- so `quantity={160}` silently ran 320,
    // doubling the per-frame cost and every density calculation made from it.
    resizeCanvas();
  };

  const onMouseMove = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { w, h } = canvasSize.current;
    const x = mousePointer.current.x - rect.left - w / 2;
    const y = mousePointer.current.y - rect.top - h / 2;
    if (x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2) {
      mouse.current.x = x;
      mouse.current.y = y;
    }
  };

  const remapValue = (value: number, start1: number, end1: number, start2: number, end2: number) => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  };

  /**
   * Where the gathering happens.
   *
   * Positions come from time, not from stored state, so there is nothing to
   * keep in sync and nothing to reset. The frequencies are tiny -- full cycles
   * take two to three minutes -- which is what makes a cluster something you
   * notice on a second visit rather than something the page performs at you.
   */
  const attractorsAt = (seconds: number) => {
    const { w, h } = canvasSize.current;
    return Array.from({ length: clusterCount }, (_, i) => {
      const phase = i * 2.1;
      return {
        x: w * (0.5 + 0.28 * Math.sin(seconds * 0.031 + phase)),
        y: h * (0.48 + 0.24 * Math.cos(seconds * 0.043 + phase * 1.4)),
      };
    });
  };

  /**
   * A line between two particles that happen to be near each other.
   *
   * Opacity falls off with distance and is capped well below the dots, so a
   * link reads as a suggestion rather than as an edge in a graph. Only social
   * particles are considered, which keeps this O(n squared) over a third of the
   * field instead of all of it.
   */
  const drawLinks = (social: Circle[]) => {
    if (!context.current) return;
    context.current.lineWidth = 0.9;

    for (let i = 0; i < social.length; i++) {
      const a = social[i] as Circle;
      for (let j = i + 1; j < social.length; j++) {
        const b = social[j] as Circle;
        const dx = a.x + a.translateX - (b.x + b.translateX);
        const dy = a.y + a.translateY - (b.y + b.translateY);
        const distance = Math.hypot(dx, dy);
        if (distance > linkDistance) continue;

        const strength = (1 - distance / linkDistance) * linkAlpha;
        context.current.strokeStyle = `rgba(${rgb.join(", ")}, ${strength.toFixed(3)})`;
        context.current.beginPath();
        context.current.moveTo(a.x + a.translateX, a.y + a.translateY);
        context.current.lineTo(b.x + b.translateX, b.y + b.translateY);
        context.current.stroke();
      }
    }
  };

  const animate = () => {
    onMouseMoveRef.current();
    clearContext();

    const attractors = cluster ? attractorsAt(performance.now() / 1000) : [];
    const social: Circle[] = [];
    circles.current.forEach((circle, i) => {
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }

      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;

      // The pull. Weak enough that gathering takes tens of seconds, and it
      // stops at clusterRadius so groups stay loose rather than collapsing to
      // a point.
      if (cluster && circle.social && attractors.length > 0) {
        let nearest = attractors[0] as { x: number; y: number };
        let best = Infinity;
        for (const point of attractors) {
          const d = Math.hypot(point.x - circle.x, point.y - circle.y);
          if (d < best) {
            best = d;
            nearest = point;
          }
        }
        if (best > clusterRadius) {
          circle.x += (nearest.x - circle.x) * 0.0009;
          circle.y += (nearest.y - circle.y) * 0.0009;
        }
        social.push(circle);
      }
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current.splice(i, 1);
        drawCircle(circleParams());
      }
    });

    // Three passes, in this order, because the order is visible: positions are
    // settled above, then the links between them, then the dots on top of those.
    // Drawing each dot inside the update loop -- as the published version does --
    // puts every line over the particles it connects.
    if (cluster && social.length > 1) drawLinks(social);
    for (const circle of circles.current) drawCircle(circle, true);

    rafID.current = window.requestAnimationFrame(animateRef.current);
  };

  initCanvasRef.current = initCanvas;
  onMouseMoveRef.current = onMouseMove;
  animateRef.current = animate;

  return (
    <div
      className={`pointer-events-none ${className}`}
      ref={canvasContainerRef}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};
