import { describe, expect, it } from "vitest";
import { TraceEvent } from "./trace.js";

describe("TraceEvent", () => {
  it("treats a timed-out adapter as an ordinary result, not an error", () => {
    const parsed = TraceEvent.parse({
      type: "adapter_result",
      at: new Date("2026-01-01"),
      adapter: "github",
      status: "timed_out",
      wave: 1,
      items: 0,
      ms: 40_000,
    });
    expect(parsed).toMatchObject({ type: "adapter_result", status: "timed_out" });
  });

  it("carries which gather wave an adapter result came from", () => {
    const wave3 = {
      type: "adapter_result",
      at: new Date(),
      adapter: "hn",
      status: "ok",
      wave: 3,
      items: 1,
      ms: 1,
    };
    expect(TraceEvent.safeParse(wave3).success).toBe(false);
  });

  /**
   * The cache hit is stated out loud. Without a name and a similarity in the
   * stream, the UI has nothing to disclose and a wrong match becomes silent.
   */
  it("makes a market match disclosable", () => {
    const parsed = TraceEvent.parse({
      type: "market_matched",
      at: new Date(),
      marketId: "m_dog_walking",
      name: "dog-walking marketplaces",
      similarity: 0.91,
      fresh: false,
    });
    expect(parsed).toMatchObject({ name: "dog-walking marketplaces", fresh: false });
  });

  it("rejects a similarity outside 0..1", () => {
    const bad = {
      type: "market_matched",
      at: new Date(),
      marketId: "m1",
      name: "x",
      similarity: 1.4,
      fresh: false,
    };
    expect(TraceEvent.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown event type", () => {
    expect(TraceEvent.safeParse({ type: "thinking", at: new Date() }).success).toBe(false);
  });
});
