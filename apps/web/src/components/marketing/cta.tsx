import Link from "next/link";
import { Validator } from "@/components/validator";
import { SHORTENER_VALIDATION } from "@/fixtures/sample";

/**
 * The call to action is the product itself.
 *
 * Not a button that scrolls somewhere, not a form that collects an email --
 * the working input box, in place. The page has just spent four sections
 * demonstrating one verdict; the only honest next move is to let you run your
 * own without asking for anything first.
 */
export function CallToAction() {
  return (
    <section id="try" className="mx-auto w-full max-w-[76rem] px-6 py-32 lg:px-10">
      <div className="mb-12 max-w-[34ch]">
        <h2 className="text-display-2 text-balance">Now do yours.</h2>
        <p className="mt-6 text-body-lg text-[var(--color-ink-soft)]">
          That verdict cited seven sources and took fourteen seconds. Nothing in it was invented.
        </p>
      </div>

      <div className="glass p-6 sm:p-10">
        <Validator />
      </div>

      <p className="mt-8 text-caption text-[var(--color-ink-soft)]">
        It is willing to say the idea does not work. Here is one where it says so:{" "}
        <Link
          href={`/v/${SHORTENER_VALIDATION.id}`}
          className="underline decoration-dotted underline-offset-4 transition-colors hover:text-[var(--accent)]"
        >
          a link shortener with a nicer dashboard
        </Link>
        .
      </p>
    </section>
  );
}
