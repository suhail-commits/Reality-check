import type { TraceEvent } from "@rc/shared";
import { buildDeps, run } from "@rc/engine";
import { DEMO_TRACE, DOG_DOSSIER, DOG_VALIDATION } from "@/fixtures/sample";

export const runtime = "nodejs";
/** Streaming means the response cannot be statically rendered at build time. */
export const dynamic = "force-dynamic";

/**
 * Vercel's Hobby tier kills a function at 60 seconds and streaming does not
 * evade that, so the run is bounded well inside it. A source that has not
 * returned by the deadline is recorded as `timed_out` and lowers confidence,
 * exactly like one that failed. The ceiling produces a weaker verdict, never a
 * broken page.
 */
const GATHER_DEADLINE_MS = 35_000;

/** Recorded gaps, played back a little faster than real time. */
const PLAYBACK_RATE = 0.55;
const MAX_GAP_MS = 1_400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Replays the recorded run.
 *
 * Not a fallback of last resort but a deliberate one: with no provider keys
 * configured, a live run would produce a truthful but useless GO FIND OUT, and
 * a deployed page that always says "not enough evidence" is worse than one that
 * honestly shows a recorded example. The client renders a sample-data badge
 * whenever this path is taken.
 */
async function replay(controller: ReadableStreamDefaultController<Uint8Array>, encode: TextEncoder) {
  let previous = DEMO_TRACE[0]?.at.getTime() ?? 0;

  for (const event of DEMO_TRACE) {
    const gap = event.at.getTime() - previous;
    previous = event.at.getTime();
    await sleep(Math.min(Math.max(gap * PLAYBACK_RATE, 90), MAX_GAP_MS));
    controller.enqueue(encode.encode(frame("trace", event)));
  }

  controller.enqueue(
    encode.encode(
      frame("result", {
        sample: true,
        validation: DOG_VALIDATION,
        dossier: DOG_DOSSIER,
      }),
    ),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    ideaText?: string;
    answers?: Record<string, string>;
    forceFresh?: boolean;
  };

  const encode = new TextEncoder();
  const { deps, report } = buildDeps();
  // Without a cheap tier there is no interview and no extraction, so a live run
  // could only ever return GO FIND OUT.
  const live = report.cheap !== "unconfigured" && Boolean(body.ideaText?.trim());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!live) {
          await replay(controller, encode);
        } else {
          const emit = (event: TraceEvent) =>
            controller.enqueue(encode.encode(frame("trace", event)));

          const result = await run(
            {
              ideaText: body.ideaText as string,
              ...(body.answers ? { answers: body.answers } : {}),
              ...(body.forceFresh ? { forceFresh: true } : {}),
            },
            { ...deps, gatherDeadlineMs: GATHER_DEADLINE_MS },
            emit,
          );

          controller.enqueue(
            encode.encode(
              frame("result", {
                sample: false,
                validation: result.verdict,
                dossier: result.dossier,
              }),
            ),
          );
        }
      } catch (error) {
        // The engine degrades rather than throwing, so reaching here means
        // something outside it broke. Say so instead of hanging the stream.
        controller.enqueue(
          encode.encode(
            frame("failed", { message: error instanceof Error ? error.message : "run failed" }),
          ),
        );
      } finally {
        controller.enqueue(encode.encode(frame("end", {})));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
