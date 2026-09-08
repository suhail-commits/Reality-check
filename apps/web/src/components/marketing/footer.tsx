export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-rule)]">
      <div className="mx-auto flex max-w-[76rem] flex-col gap-8 px-6 py-14 lg:flex-row lg:items-end lg:px-10">
        <div className="max-w-[38ch]">
          <p className="text-[15px] font-medium">Reality Check</p>
          <p className="mt-3 text-caption text-[var(--color-ink-soft)]">
            The verdict is decided by a deterministic rubric, not by a language model. Any sentence
            the model writes that cannot be traced to a quote is dropped before you see it.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-8 gap-y-3 lg:ml-auto">
          {[
            { label: "How it decides", href: "#method" },
            { label: "Evidence", href: "#evidence" },
            { label: "Checked against history", href: "#metrics" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-caption text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
