"use client";

import { Counter, Reveal } from "./primitives";

/**
 * The metrics section, and the reason it opens with zero.
 *
 * Every company in this category leads with a number that flatters it -- ideas
 * validated, users served, accuracy percent. The only number worth leading with
 * here is the one that is zero, because it is the guarantee nobody else can
 * make: no verdict this tool has ever produced was decided by a language model.
 *
 * The three that follow exist to make the zero credible. A claim like that is
 * worth nothing without the tests that hold it in place.
 */
const METRICS = [
  {
    value: 0,
    suffix: "",
    label: "verdicts decided by a language model",
    note: "The model reads sources and writes the explanation. The decision is ordinary code.",
    lead: true,
  },
  {
    value: 182,
    suffix: "",
    label: "tests holding that guarantee in place",
    note: "Including one that runs the whole pipeline with a model told to say the opposite.",
  },
  {
    value: 15,
    suffix: "",
    label: "historical markets it is checked against",
    note: "Airbnb in 2008, Dropbox in 2007, Slack in 2013. None of them get told no.",
  },
  {
    value: 14,
    suffix: "s",
    label: "to read a market and reach a verdict",
    note: "Every claim in that verdict links to the page it came from.",
  },
];

export function Metrics() {
  return (
    <section id="metrics" className="mx-auto w-full max-w-[76rem] px-6 py-32 lg:px-10">
      <div className="grid gap-x-16 gap-y-16 lg:grid-cols-2">
        {METRICS.map((metric, i) => (
          <Reveal key={metric.label} delay={i * 0.08}>
            <div className={metric.lead ? "lg:col-span-2" : ""}>
              <p
                className={`tabular-nums ${
                  metric.lead
                    ? "text-display-1 text-[var(--accent)] transition-colors duration-700"
                    : "text-display-2"
                }`}
              >
                <Counter to={metric.value} suffix={metric.suffix} />
              </p>
              <p className="mt-4 max-w-[34ch] text-body-lg text-balance">{metric.label}</p>
              <p className="mt-3 max-w-[46ch] text-caption text-[var(--color-ink-soft)]">
                {metric.note}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
