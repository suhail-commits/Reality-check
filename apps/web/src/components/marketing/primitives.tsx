"use client";

import type { Evidence } from "@rc/shared";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { reveal, usePrefersReducedMotion } from "@/lib/motion";
import { formatDate, SOURCE_LABEL } from "@/lib/verdict";

export function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`glass ${className}`}>{children}</div>;
}

/** Fade, lift and un-blur once, when the element first comes into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Leans toward the cursor, springs back on leave.
 *
 * The pull is small on purpose. A button that chases the pointer across half its
 * own width is a toy; six pixels reads as weight, as though the element has mass
 * and the cursor has a slight pull on it.
 */
export function MagneticButton({
  children,
  onClick,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18 });
  const springY = useSpring(y, { stiffness: 260, damping: 18 });

  const onMove = (event: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > 80) return;
    x.set((dx / 80) * 6);
    y.set((dy / 80) * 6);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const base =
    "relative inline-flex items-center justify-center rounded-full px-8 py-4 text-[16px] font-medium transition-colors duration-300";
  const skin =
    variant === "primary"
      ? "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-sage)]"
      : "border border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-sage)]";

  // A halo the colour of the paper's own tint, not a glow. On ivory a bloom
  // reads as a smudge; a soft shadow reads as the button lifting off the page.
  const glow =
    variant === "primary"
      ? "after:absolute after:inset-0 after:-z-10 after:rounded-full after:bg-[var(--color-sage-wash)] after:opacity-0 after:blur-lg after:transition-opacity after:duration-300 hover:after:opacity-90"
      : "";

  const props = {
    ref: ref as never,
    className: `${base} ${skin} ${glow}`,
    style: { x: springX, y: springY },
    onMouseMove: onMove,
    onMouseLeave: reset,
  };

  if (href) {
    return (
      <motion.a href={href} {...props}>
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button type="button" onClick={onClick} {...props}>
      {children}
    </motion.button>
  );
}

/**
 * One piece of evidence.
 *
 * The quote is the only monospace on the page, and that is semantic rather than
 * decorative: it means these are the words as they were written, unedited. The
 * citation id and the outbound link are the product's whole promise made
 * visible -- you can go and check.
 */
export function EvidenceCard({
  evidence,
  index,
  dense = false,
}: {
  evidence: Evidence;
  index: number;
  /**
   * Tighter padding and a smaller quote, for places where several cards stack
   * in a column and their combined height sets the height of the section
   * around them. Nothing is hidden or truncated -- the same quote, the same
   * source, the same link, in less room.
   */
  dense?: boolean;
}) {
  const tone =
    evidence.kind === "praise" ? "text-[var(--color-build)]" : "text-[var(--color-dont)]";

  return (
    <Reveal delay={index * (dense ? 0.05 : 0.08)}>
      <div className={`paper hover:paper-lift ${dense ? "p-3.5" : "p-6"}`}>
        <p
          className={`font-mono text-[var(--color-ink)] ${
            dense ? "text-[12.5px] leading-[1.55]" : "text-[0.9375rem] leading-relaxed"
          }`}
        >
          &ldquo;{evidence.quote}&rdquo;
        </p>
        <div
          className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[var(--color-ink-faint)] ${
            dense ? "mt-2 text-[10.5px]" : "mt-4 text-caption"
          }`}
        >
          <span className={tone}>{evidence.kind === "praise" ? "praise" : "complaint"}</span>
          <span>{SOURCE_LABEL[evidence.source] ?? evidence.source}</span>
          <span>{formatDate(evidence.postedAt)}</span>
          <a
            href={evidence.url}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto font-mono text-[var(--color-ink-soft)] underline decoration-dotted underline-offset-4 transition-colors hover:text-[var(--accent)]"
          >
            {evidence.id}
          </a>
        </div>
      </div>
    </Reveal>
  );
}

/**
 * A bar whose fill is driven by an outside progress value, 0 to 1.
 *
 * The value arrives as a plain number from ScrollTrigger rather than as a motion
 * value, so the width is set directly and CSS handles the smoothing. Wrapping it
 * in a spring here would put two easing curves in series and make the bar lag
 * behind the scroll position it is supposed to be reporting.
 */
export function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-rule)]">
        <div
          className="h-full rounded-full bg-[var(--color-dont)] transition-[width] duration-150 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="text-caption text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}
