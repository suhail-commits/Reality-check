import type { RateLimitPolicy } from "./types.js";

/**
 * One limiter per adapter, so a slow source cannot hold up a fast one.
 *
 * Deliberately a queue rather than a rejection: being polite to a free API is
 * the price of not needing a key, and a request that waits is better than one
 * that fails and costs us confidence. The gather deadline is what stops the
 * waiting from being unbounded -- a request still queued when the deadline
 * passes is abandoned along with everything else that adapter was doing.
 */
export class RateLimiter {
  private queue: Promise<void> = Promise.resolve();
  private sentInBurst = 0;

  constructor(
    private readonly policy: RateLimitPolicy,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Resolves when it is this caller's turn. Rejects if the signal aborts. */
  async take(signal?: AbortSignal): Promise<void> {
    const wait = this.queue.then(async () => {
      if (this.sentInBurst >= this.policy.burst) {
        await this.sleep(this.policy.minIntervalMs);
        this.sentInBurst = 0;
      }
      this.sentInBurst++;
    });

    // Keep the chain alive even if this caller gives up, so ordering holds.
    this.queue = wait.catch(() => undefined);

    if (!signal) return wait;

    return Promise.race([
      wait,
      new Promise<void>((_, reject) => {
        if (signal.aborted) return reject(new Error("aborted"));
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    ]);
  }
}
