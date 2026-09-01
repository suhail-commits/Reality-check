import Link from "next/link";
import { Validator } from "@/components/validator";
import { SHORTENER_VALIDATION } from "@/fixtures/sample";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-12">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Does your idea already exist, and does anyone want it?
        </h1>
        <p className="max-w-xl text-[17px] text-pretty text-[var(--color-ink-soft)]">
          Most idea validators score you out of ten and tell you what you hoped to hear. This one
          reads what people actually wrote, links every claim to its source, and will tell you not
          to build it.
        </p>
      </header>

      <Validator />

      <footer className="mt-auto space-y-3 border-t border-[var(--color-rule)] pt-6 text-sm text-[var(--color-ink-faint)]">
        <p>
          The verdict is decided by a deterministic rubric, not by a language model. The model only
          reads sources and writes the explanation. Any sentence it writes that cannot be traced to
          a quote is dropped before you see it.
        </p>
        <p>
          Here is one it says no to:{" "}
          <Link
            href={`/v/${SHORTENER_VALIDATION.id}`}
            className="underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-ink)]"
          >
            a link shortener with a nicer dashboard
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
