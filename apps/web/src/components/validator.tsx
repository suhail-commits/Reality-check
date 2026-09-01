"use client";

import type { Dossier, TraceEvent, Validation } from "@rc/shared";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { MarketMatch, SampleBadge } from "./chrome";
import { TraceView } from "./trace-view";
import { VerdictCard } from "./verdict-card";

type Phase = "idle" | "interview" | "running" | "done";

export interface RunPayload {
  /** True when the server replayed a recorded run instead of gathering live. */
  sample: boolean;
  validation: Validation;
  dossier: Dossier;
}

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
    options: ["The end user, per month", "Their employer", "Nobody yet - it's free"],
  },
  {
    id: "alternative",
    q: "What do they do today instead?",
    options: ["Use an existing tool", "A spreadsheet", "Nothing - they just put up with it"],
  },
  {
    id: "inaction",
    q: "What happens if they never solve it?",
    options: ["They keep paying for something they dislike", "They lose money", "Not much"],
  },
] as const;

/**
 * Reads the run as it happens.
 *
 * The stream carries named frames: `trace` for each TraceEvent, one `result`
 * with the verdict and its evidence, and `failed` if something outside the
 * engine broke. The engine itself degrades rather than throwing, so `failed`
 * should be rare -- but a stream that can end without saying anything would
 * leave the page spinning forever.
 */
function useTraceStream() {
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const start = useCallback(
    async (
      body: { ideaText: string; answers: Record<string, string> },
      onDone: () => void,
    ): Promise<void> => {
      setEvents([]);
      setPayload(null);
      setError(null);
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      try {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("no response body");

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
            const name = chunk.match(/^event: (\w+)/)?.[1];
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!name || !line) continue;

            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

            if (name === "trace") {
              const raw = data as unknown as TraceEvent & { at: string };
              setEvents((prev) => [...prev, { ...raw, at: new Date(raw.at) } as TraceEvent]);
            } else if (name === "result") {
              setPayload(data as unknown as RunPayload);
            } else if (name === "failed") {
              setError(String(data.message ?? "the run failed"));
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "the run failed");
        }
      }

      onDone();
    },
    [],
  );

  const stop = useCallback(() => abort.current?.abort(), []);
  return { events, payload, error, start, stop };
}

export function Validator() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [idea, setIdea] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { events, payload, error, start, stop } = useTraceStream();

  const match = events.find((e) => e.type === "market_matched");

  const reset = () => {
    stop();
    setPhase("idle");
    setAnswers({});
  };

  const begin = () => {
    setPhase("running");
    void start({ ideaText: idea, answers }, () => setPhase("done"));
  };

  if (phase === "done" && payload) {
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
          {payload.sample ? <SampleBadge /> : null}
        </div>

        {match?.type === "market_matched" ? (
          <MarketMatch
            name={match.name}
            similarity={match.similarity}
            fresh={match.fresh}
            onReject={reset}
          />
        ) : null}

        <VerdictCard validation={payload.validation} dossier={payload.dossier} />

        <footer className="border-t border-[var(--color-rule)] pt-6 text-sm text-[var(--color-ink-faint)]">
          Shareable link:{" "}
          <Link
            href={`/v/${payload.validation.id}`}
            className="underline decoration-dotted underline-offset-4 hover:text-[var(--color-ink)]"
          >
            /v/{payload.validation.id}
          </Link>
        </footer>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-dont)]">
          The run failed{error ? `: ${error}` : " before it produced a verdict."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm underline decoration-dotted underline-offset-4"
        >
          Try again
        </button>
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
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: picked ? "" : o }))}
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
            onClick={begin}
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
