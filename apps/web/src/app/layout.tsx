import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Idea Reality Check",
  description:
    "Find out whether your idea already exists, how yours would differ, and whether anyone actually wants it. Every claim links to its source.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
          {children}
        </div>
      </body>
    </html>
  );
}
