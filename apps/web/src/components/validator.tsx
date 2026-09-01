"use client";

import type { TraceEvent } from "@rc/shared";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { MarketMatch, SampleBadge } from "./chrome";
import { TraceView } from "./trace-view";
import { VerdictCard } from "./verdict-card";
import { DOG_DOSSIER, DOG_VALIDATION } from "@/fixtures/sample";

type Phase = "idle" | "interview" | "running" | "done";

/**
 * Three questions, each answerable by tapping. The interview is not a form to
 * be endured -- it is where verdict quality is won, because "an app for dog
 * walkers" is not a searchable problem statement and feeding it straight to a
 * model is what every competitor in this category does.
 *
 * Skipping is allowed and lowers confidence rather than blocking the run.
 */
const QUESTIONS = [
  {
    id: "payer",
    q: "Who actually pays for this?",
    options: ["Dog owners, per walk", "The walkers, as a subscription", "Nobody yet - it's free"],
  },
  {
    id: "alternative",
    q: "What do they do today instead?",
    options: ["Use Rover or Wag", "Ask a neighbour", "Nothing - they just worry"],
  },
  {
    id: "inaction",
    q: "What happens if they never solve it?",
    options: ["They keep using something they distrust", "They stop paying for walks", "Not much"],
  },
] as const;

function useTraceStream() {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (onDone: () => void) => {
    setEvents([]);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    const res = await fetch("/api/validate", { signal: controller.signal });
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        if (chunk.startsWith("event: end")) continue;
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const raw = JSON.parse(line.slice(6)) as TraceEvent & { at: string };
        setEvents((prev) => [...prev, { ...raw, at: new Date(raw.at) } as TraceEvent]);
      }
    }

    onDone();
  }, []);

  const stop = useCallback(() => abort.current?.abort(), []);
  return { events, run, stop };
}

export function Validator() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { events, run, stop } = useTraceStream();

  const match = events.find((e) => e.type === "market_matched");

  const reset = () => {
    stop();
    setPhase("idle");
    setAnswers({});
  };

  const start = () => {
    setPhase("running");
    void run(() => setPhase("done"));
  };

  if (phase === "done") {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={reset}
            className="text-sm text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-ink)]"
          >
            Check another idea
          </button>
          <SampleBadge />
        </div>

        {match?.type === "market_matched" ? (
          <MarketMatch
            name={match.name}
            similarity={match.similarity}
            fresh={match.fresh}
            onReject={reset}
          />
        ) : null}

        <VerdictCard validation={DOG_VALIDATION} dossier={DOG_DOSSIER} />

        <footer className="border-t border-[var(--color-rule)] pt-6 text-sm text-[var(--color-ink-faint)]">
          Shareable link:{" "}
          <Link
            href={`/v/${DOG_VALIDATION.id}`}
            className="underline decoration-dotted underline-offset-4 hover:text-[var(--color-ink)]"
          >
            /v/{DOG_VALIDATION.id}
          </Link>
        </footer>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-[var(--color-ink-soft)]">
          Reading what people actually said about <strong>{idea || "your idea"}</strong>.
        </p>
        <TraceView events={events} running />
        <button
          type="button"
          onClick={reset}
          className="text-sm text-[var(--color-ink-faint)] underline decoration-dotted underline-offset-4"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase === "interview") {
    const answered = QUESTIONS.filter((q) => answers[q.id]).length;

    return (
      <div className="space-y-8">
        <div>
          <p className="text-[11px] font-medium tracking-widest text-[var(--color-ink-faint)] uppercase">
            Three questions, about fifteen seconds
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Skip any of them. Skipping lowers confidence rather than stopping the run.
          </p>
        </div>

        <ol className="space-y-6">
          {QUESTIONS.map((q) => (
            <li key={q.id} className="space-y-3">
              <p className="font-medium">{q.q}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const picked = answers[q.id] === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: picked ? "" : o }))
                      }
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                        picked
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--color-paper)]"
                          : "border-[var(--color-rule)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-[var(--color-ink)] px-5 py-2.5 font-medium text-[var(--color-paper)] transition hover:opacity-90"
          >
            {answered === 0 ? "Skip and check anyway" : "Check it"}
          </button>
          <span className="text-xs text-[var(--color-ink-faint)]">
            {answered} of {QUESTIONS.length} answered
          </span>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (idea.trim()) setPhase("interview");
      }}
      className="space-y-5"
    >
      <label htmlFor="idea" className="block text-lg font-medium">
        Describe your idea.
      </label>

      <textarea
        id="idea"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={3}
        placeholder="an app for dog walkers"
        className="w-full resize-none rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-sunk)] px-4 py-3.5 text-[17px] outline-none transition placeholder:text-[var(--color-ink-faint)] focus:border-[var(--accent)]"
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!idea.trim()}
          className="rounded-lg bg-[var(--color-ink)] px-5 py-2.5 font-medium text-[var(--color-paper)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Check it
        </button>
        <span className="text-sm text-[var(--color-ink-faint)]">
          No account. No email. Nothing saved unless you share the link.
        </span>
      </div>
    </form>
  );
}
