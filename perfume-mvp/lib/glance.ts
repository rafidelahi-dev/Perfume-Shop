import { MIN_VOTERS_FOR_RESULTS, POLLS } from "@/lib/polls";
import { topPick, type TopPick } from "@/lib/perfumeSnapshot";
import type { ReviewAggregate } from "@/lib/queries/perfumes";

/** One averaged bar: score is 0..1, or null while there are too few votes. */
export type GlanceBar = { score: number | null; label: string };

export type Glance = {
  dna: GlanceBar;
  performance: GlanceBar;
  price: GlanceBar & { lowPrice: number | null };
  trendFlames: number;
  /** Gender lean and day/night read, shown as chips under the bars. */
  gender: TopPick | null;
  timeOfDay: TopPick | null;
  climate: string[];
  places: string[];
};

const MIN_YES_NO_VOTES = 3;
const YES_SHARE = 0.6;

/** Mean position (0..1) of the votes along an ordered single-choice poll. */
export function pollScore(aggregate: ReviewAggregate, dimension: string): number | null {
  if ((aggregate.voter_counts[dimension] ?? 0) < MIN_VOTERS_FOR_RESULTS) return null;
  const opts = POLLS.find((p) => p.key === dimension)?.options ?? [];
  const counts = aggregate.polls[dimension] ?? {};
  let sum = 0;
  let total = 0;
  opts.forEach((o, i) => {
    const yes = counts[o.value]?.yes ?? 0;
    sum += yes * i;
    total += yes;
  });
  return total > 0 && opts.length > 1 ? sum / total / (opts.length - 1) : null;
}

function pollLabel(dimension: string, score: number): string {
  const opts = POLLS.find((p) => p.key === dimension)?.options ?? [];
  return opts[Math.round(score * (opts.length - 1))]?.label ?? "";
}

const PERFORMANCE_BANDS = ["Light", "Moderate", "Strong", "Beast"];

/** Options most voters said "yes" to (at least 60%, with a few votes behind it). */
function yesOptions(aggregate: ReviewAggregate, dimension: string): string[] {
  const opts = POLLS.find((p) => p.key === dimension)?.options ?? [];
  const counts = aggregate.polls[dimension] ?? {};
  return opts
    .filter((o) => {
      const c = counts[o.value];
      return c && c.yes + c.no >= MIN_YES_NO_VOTES && c.yes / (c.yes + c.no) >= YES_SHARE;
    })
    .map((o) => o.label);
}

export function buildGlance(
  aggregate: ReviewAggregate,
  lowPrice: number | null,
  trendFlames: number
): Glance {
  const longevity = pollScore(aggregate, "longevity");
  const projection = pollScore(aggregate, "projection");
  const perf = [longevity, projection].filter((n): n is number => n != null);
  const perfScore = perf.length > 0 ? perf.reduce((a, b) => a + b, 0) / perf.length : null;

  const value = pollScore(aggregate, "value");
  const hasRating = aggregate.rating_avg != null && aggregate.review_count > 0;

  return {
    dna: {
      score: hasRating ? aggregate.rating_avg! / 5 : null,
      label: hasRating ? `${aggregate.rating_avg!.toFixed(1)} / 5` : "No ratings yet",
    },
    performance: {
      score: perfScore,
      label:
        perfScore != null
          ? PERFORMANCE_BANDS[Math.min(3, Math.floor(perfScore * 4))]
          : "No votes yet",
    },
    price: {
      score: value,
      label: value != null ? pollLabel("value", value) : "No votes yet",
      lowPrice,
    },
    trendFlames: Math.max(0, Math.min(5, Math.round(trendFlames))),
    gender: topPick(aggregate, "gender"),
    timeOfDay: topPick(aggregate, "timeofday"),
    climate: yesOptions(aggregate, "climate"),
    places: yesOptions(aggregate, "place"),
  };
}
