"use client";

import { useEffect, useState } from "react";
import { MagneticButton } from "./primitives";

const LINKS = [
  { label: "How it decides", href: "#method" },
  { label: "See a real one", href: "#example" },
  { label: "Checked against history", href: "#metrics" },
];

/**
 * Transparent over the hero, glass once you have left it.
 *
 * The border only appears after scrolling, so the hero reads as one
 * uninterrupted field rather than a page with a bar stuck to the top of it.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[var(--color-rule)] bg-[color-mix(in_oklch,var(--color-paper)_72%,transparent)] backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[76rem] items-center gap-8 px-6 py-4 lg:px-10">
        <a href="#top" className="text-[15px] font-medium tracking-tight">
          Reality Check
        </a>

        <div className="ml-auto hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-caption text-[var(--color-ink-soft)] transition-colors duration-200 hover:text-[var(--color-ink)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="ml-auto md:ml-0">
          <MagneticButton href="#try" variant="ghost">
            Check an idea
          </MagneticButton>
        </div>
      </nav>
    </header>
  );
}
