import { DEMO_TRACE } from "@/fixtures/sample";

export const runtime = "nodejs";
/** Streaming means the response cannot be statically rendered at build time. */
export const dynamic = "force-dynamic";

/**
 * Replays a recorded run as Server-Sent Events.
 *
 * When `packages/engine` lands, this handler runs the real pipeline and writes
 * the same `TraceEvent` shape to the same stream. Nothing on the client changes
 * -- which is the whole reason `TraceEvent` is a schema in `packages/shared`
 * rather than an implementation detail of the engine.
 *
 * Note the deadline below. Vercel's Hobby tier kills a function at 60 seconds
 * and streaming does not evade that, so the run is bounded well inside it: a
 * source that has not returned by then is recorded as `timed_out` and lowers
 * confidence, exactly like one that failed. The ceiling produces a weaker
 * verdict, never a broken page.
 */
const GATHER_DEADLINE_MS = 40_000;

/** Recorded gaps, played back a little faster than real time. */
const PLAYBACK_RATE = 0.55;
const MAX_GAP_MS = 1_400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET() {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let previous = DEMO_TRACE[0]?.at.getTime() ?? 0;

      for (const event of DEMO_TRACE) {
        const gap = event.at.getTime() - previous;
        previous = event.at.getTime();

        await sleep(Math.min(Math.max(gap * PLAYBACK_RATE, 90), MAX_GAP_MS));

        if (Date.now() - startedAt > GATHER_DEADLINE_MS) break;

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
      controller.close();
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
