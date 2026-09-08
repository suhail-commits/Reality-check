import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import "./globals.css";

/*
 * Two families, one job each.
 *
 * Instrument Sans is the structural face -- a grotesque with enough character to
 * hold at 140px, and deliberately not Inter, which the app itself uses and which
 * is the reflex choice on every other dark SaaS page.
 *
 * JetBrains Mono appears only inside evidence quotes. That is semantic rather
 * than decorative: monospace means these are the words as they were written,
 * unedited, which is the entire promise of the product.
 */
const display = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reality Check",
  description:
    "Most idea validators tell you what you hoped to hear. This one reads what people actually wrote, links every claim to its source, and will tell you not to build it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {/* Ambient light and grain sit under everything and never intercept clicks. */}
        <div className="ambient" aria-hidden />
        <div className="grain" aria-hidden />
        <SmoothScroll>
          <div className="relative z-10">{children}</div>
        </SmoothScroll>
      </body>
    </html>
  );
}
