"use client";

/**
 * The slot where a logo wall normally goes.
 *
 * There are no customers, so there are no customer logos. A wall of borrowed
 * marks is exactly the kind of unearned confidence this product exists to call
 * out, and a visitor who recognises one as fake stops believing the rest of the
 * page.
 *
 * What goes here instead is more useful anyway: the places the evidence comes
 * from, with the ones that are not connected yet marked as not connected. It
 * fills the same visual role and it is checkable.
 */
const SOURCES = [
  { name: "Hacker News", live: true },
  { name: "GitHub", live: true },
  { name: "Reddit", live: false },
  { name: "App Store", live: false },
  { name: "Web search", live: false },
  { name: "npm & PyPI", live: false },
];

function Row() {
  return (
    <>
      {SOURCES.map((source) => (
        <div
          key={source.name}
          className="flex shrink-0 items-center gap-3 px-8 py-4"
          aria-hidden={undefined}
        >
          <span
            className={`size-1.5 rounded-full ${
              source.live ? "bg-[var(--color-build)]" : "bg-[var(--color-rule)]"
            }`}
          />
          <span
            className={`text-body-lg whitespace-nowrap ${
              source.live ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"
            }`}
          >
            {source.name}
          </span>
          {!source.live ? (
            <span className="text-caption text-[var(--color-ink-faint)]">not connected</span>
          ) : null}
        </div>
      ))}
    </>
  );
}

export function Sources() {
  return (
    <section className="border-y border-[var(--color-rule)] py-14">
      <p className="mx-auto mb-8 max-w-[76rem] px-6 text-support text-[var(--color-ink-soft)] lg:px-10">
        Every claim comes from one of these. Two are connected today.
      </p>

      <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <Row />
          <Row />
        </div>
      </div>
    </section>
  );
}
