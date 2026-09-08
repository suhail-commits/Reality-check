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
 *
 * Everything inside is laid out across rather than down. The section used to run
 * past four screens, almost all of it padding and centred columns that could not
 * use the width beside them; it is the same content in roughly a third of the
 * height.
 */
export function Exhibit({ children }: { children: React.ReactNode }) {
  const { ideaText, ideaSpec, createdAt } = DOG_VALIDATION;

  return (
    <section id="example" className="mx-auto w-full max-w-[76rem] px-6 py-16 lg:px-10 lg:py-20">
      <div
        data-exhibit
        className="overflow-hidden rounded-[18px] border border-[var(--color-rule)] bg-[var(--color-paper-warm)] shadow-[0_1px_2px_rgba(17,17,17,0.03),0_28px_64px_-40px_rgba(17,17,17,0.16)]"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-rule)] px-6 py-3 lg:px-10">
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

        <div className="grid gap-x-12 gap-y-5 border-b border-[var(--color-rule)] px-6 py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-10 lg:py-8">
          <div>
            <p className="text-[11px] text-[var(--color-ink-faint)]">What they typed in</p>
            <p className="mt-2 text-[clamp(1.375rem,2.2vw,1.875rem)] leading-tight tracking-[-0.02em] text-balance">
              &ldquo;{ideaText}&rdquo;
            </p>
          </div>
          {ideaSpec.statedWedge ? (
            <div className="lg:self-end">
              <p className="text-[11px] text-[var(--color-ink-faint)]">Their angle</p>
              <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
                {ideaSpec.statedWedge}.
              </p>
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </section>
  );
}
