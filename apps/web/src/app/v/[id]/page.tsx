import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBadge } from "@/components/chrome";
import { VerdictCard } from "@/components/verdict-card";
import { SAMPLES } from "@/fixtures/sample";
import { VERDICT_STYLE } from "@/lib/verdict";

/**
 * The permalink, and the portfolio artifact.
 *
 * It renders from stored data alone -- no run, no model call, no adapter -- so
 * it loads instantly, costs nothing, and cannot be broken by a rate limit or a
 * dead source at two in the morning.
 */
export async function generateStaticParams() {
  return Object.keys(SAMPLES).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sample = SAMPLES[id];
  if (!sample) return { title: "Not found" };

  const style = VERDICT_STYLE[sample.validation.verdict];
  return {
    title: `${style.label} - ${sample.validation.ideaText}`,
    description: style.gloss,
  };
}

export default async function SharedVerdict({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sample = SAMPLES[id];
  if (!sample) notFound();

  return (
    <main className="flex flex-1 flex-col gap-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-ink)]"
          >
            Idea Reality Check
          </Link>
          <p className="mt-2 text-lg font-medium text-pretty">
            &ldquo;{sample.validation.ideaText}&rdquo;
          </p>
        </div>
        <SampleBadge />
      </header>

      <VerdictCard validation={sample.validation} dossier={sample.dossier} />

      <footer className="mt-auto border-t border-[var(--color-rule)] pt-6 text-sm text-[var(--color-ink-faint)]">
        <Link
          href="/"
          className="underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-ink)]"
        >
          Check your own idea
        </Link>
      </footer>
    </main>
  );
}
