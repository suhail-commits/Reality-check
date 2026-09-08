import { DOG_VALIDATION } from "@/fixtures/sample";
import { formatDate } from "@/lib/verdict";

/**
 * The frame around the worked example.
 *
 * Without this, the run reads as the product. A visitor who scrolls into
 * "an app for dog walkers" set large, with no container around it, reasonably
 * concludes that a dog-walking app is what this company makes.
 *
 * So the example gets treated the way an enterprise site treats a case study:
 * a labelled header, an inset ground, its own border, and the submitted idea
 * quoted rather than displayed as a headline. Everything inside the frame is
 * evidently *a thing the product did*, not the product.
 *
 * The frame also scopes the accent. `--accent` is set on this element rather
 * than on the document, so the colour change when the verdict lands belongs to
 * the example that produced it instead of flooding a page that has not decided
 * anything.
 */
export function Exhibit({ children }: { children: React.ReactNode }) {
  const { ideaText, ideaSpec, createdAt } = DOG_VALIDATION;

  return (
    <section id="example" className="mx-auto w-full max-w-[76rem] px-6 py-24 lg:px-10 lg:py-32">
      <div
        data-exhibit
        className="overflow-hidden rounded-[18px] border border-[var(--color-rule)] bg-[var(--color-paper-warm)] shadow-[0_1px_2px_rgba(17,17,17,0.03),0_28px_64px_-40px_rgba(17,17,17,0.16)]"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-rule)] px-6 py-4 lg:px-10">
          <span className="text-caption font-medium text-[var(--color-ink)]">
            One run, start to finish
          </span>
          <span className="text-caption text-[var(--color-ink-faint)]">
            somebody else&rsquo;s idea, not ours
          </span>
          <span className="ml-auto font-mono text-caption text-[var(--color-ink-faint)]">
            {formatDate(createdAt)}
          </span>
        </div>

        <div className="border-b border-[var(--color-rule)] px-6 py-10 lg:px-10 lg:py-14">
          <p className="text-caption text-[var(--color-ink-faint)]">What they typed in</p>
          <p className="text-headline mt-4 max-w-[26ch] text-balance">
            &ldquo;{ideaText}&rdquo;
          </p>
          {ideaSpec.statedWedge ? (
            <p className="mt-5 max-w-[46ch] text-body-lg text-[var(--color-ink-soft)]">
              Their angle: {ideaSpec.statedWedge}.
            </p>
          ) : null}
        </div>

        {children}
      </div>
    </section>
  );
}
