import type { Metadata } from "next";
import type { Dossier, Validation } from "@rc/shared";
import { FileStore } from "@rc/engine";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SampleBadge } from "@/components/chrome";
import { VerdictCard } from "@/components/verdict-card";
import { SAMPLES } from "@/fixtures/sample";
import { VERDICT_STYLE } from "@/lib/verdict";

/** A stored run is served on demand; the samples are prerendered at build. */
export const dynamicParams = true;

interface Shared {
  validation: Validation;
  dossier: Dossier;
  sample: boolean;
}

/**
 * The permalink, and the portfolio artifact.
 *
 * A stored verdict renders from persisted data alone -- no run, no model call,
 * no adapter -- so it loads instantly, costs nothing, and cannot be broken by a
 * rate limit or a dead source at two in the morning. The sample verdicts are
 * the fallback, and say so on the page.
 */
async function load(id: string): Promise<Shared | null> {
  const sample = SAMPLES[id];
  if (sample) return { ...sample, sample: true };

  try {
    const stored = await new FileStore().validation(id);
    if (stored) return { ...stored, sample: false };
  } catch {
    // A store that cannot be read is a 404, never a 500.
  }
  return null;
}

export async function generateStaticParams() {
  return Object.keys(SAMPLES).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await load(id);
  if (!found) return { title: "Not found" };

  const style = VERDICT_STYLE[found.validation.verdict];
  return {
    title: `${style.label} - ${found.validation.ideaText}`,
    description: style.gloss,
  };
}

export default async function SharedVerdict({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await load(id);
  if (!found) notFound();

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
            &ldquo;{found.validation.ideaText}&rdquo;
          </p>
        </div>
        {found.sample ? <SampleBadge /> : null}
      </header>

      <VerdictCard validation={found.validation} dossier={found.dossier} />

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
