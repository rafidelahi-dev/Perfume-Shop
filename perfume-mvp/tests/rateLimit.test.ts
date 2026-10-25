import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryRateLimit as rateLimit } from "@/lib/rateLimit";

afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("blocks after the limit and frees up when the window passes", () => {
    vi.useFakeTimers();
    expect(rateLimit("k1", 2, 1000)).toBe(true);
    expect(rateLimit("k1", 2, 1000)).toBe(true);
    expect(rateLimit("k1", 2, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("k1", 2, 1000)).toBe(true);
  });
  it("keeps keys separate", () => {
    expect(rateLimit("a", 1, 1000)).toBe(true);
    expect(rateLimit("b", 1, 1000)).toBe(true);
  });
});
