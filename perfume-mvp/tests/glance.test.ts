import { describe, expect, it } from "vitest";
import { buildGlance, pollScore } from "@/lib/glance";
import { EMPTY_AGGREGATE, type ReviewAggregate } from "@/lib/queries/perfumes";
import { POLLS } from "@/lib/polls";

const longevity = POLLS.find((p) => p.key === "longevity")!.options;
const votes = (counts: number[]): ReviewAggregate => ({
  ...EMPTY_AGGREGATE,
  voter_counts: { longevity: counts.reduce((a, b) => a + b, 0) },
  polls: {
    longevity: Object.fromEntries(longevity.map((o, i) => [o.value, { yes: counts[i] ?? 0, no: 0 }])),
  },
});

describe("pollScore", () => {
  it("is null below the minimum voters", () => {
    expect(pollScore(votes([1, 1]), "longevity")).toBeNull();
  });
  it("is 0 when everyone picks the first option and 1 for the last", () => {
    const n = longevity.length;
    expect(pollScore(votes([5]), "longevity")).toBe(0);
    expect(pollScore(votes([...Array(n - 1).fill(0), 5]), "longevity")).toBe(1);
  });
});

describe("buildGlance", () => {
  it("shows empty labels with no data and clamps flames", () => {
    const g = buildGlance(EMPTY_AGGREGATE, null, 9);
    expect(g.dna.score).toBeNull();
    expect(g.performance.label).toBe("No votes yet");
    expect(g.trendFlames).toBe(5);
    expect(buildGlance(EMPTY_AGGREGATE, null, -2).trendFlames).toBe(0);
  });
  it("scales the rating to 0..1", () => {
    const g = buildGlance({ ...EMPTY_AGGREGATE, review_count: 4, rating_avg: 4 }, 1200, 0);
    expect(g.dna.score).toBeCloseTo(0.8);
    expect(g.price.lowPrice).toBe(1200);
  });
});
