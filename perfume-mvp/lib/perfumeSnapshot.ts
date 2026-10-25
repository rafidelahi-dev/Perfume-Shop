import { MIN_VOTERS_FOR_RESULTS, POLLS } from "@/lib/polls";
import {
  EMPTY_AGGREGATE,
  createPublicSupabase,
  fetchPerfumeReviewAggregate,
  type PerfumeProfile,
  type ReviewAggregate,
} from "@/lib/queries/perfumes";

export type TopPick = { label: string; share: number };

/** The few facts Bangladeshi buyers weigh first: rating, price, performance, who it suits. */
export type PerfumeSnapshot = {
  ratingAvg: number | null;
  reviewCount: number;
  lowPrice: number | null;
  longevity: TopPick | null;
  projection: TopPick | null;
  gender: TopPick | null;
  value: TopPick | null;
};

/** Most-voted option of a single-choice poll, or null while there are too few voters. */
export function topPick(aggregate: ReviewAggregate, dimension: string): TopPick | null {
  const voters = aggregate.voter_counts[dimension] ?? 0;
  if (voters < MIN_VOTERS_FOR_RESULTS) return null;
  const counts = aggregate.polls[dimension] ?? {};
  let best: { value: string; yes: number } | null = null;
  for (const [value, c] of Object.entries(counts)) {
    if (!best || c.yes > best.yes) best = { value, yes: c.yes };
  }
  if (!best || best.yes === 0) return null;
  const label = POLLS.find((p) => p.key === dimension)?.options.find((o) => o.value === best.value)?.label;
  return label ? { label, share: best.yes / voters } : null;
}

export function snapshotFromAggregate(
  aggregate: ReviewAggregate,
  lowPrice: number | null
): PerfumeSnapshot {
  return {
    ratingAvg: aggregate.rating_avg,
    reviewCount: aggregate.review_count,
    lowPrice,
    longevity: topPick(aggregate, "longevity"),
    projection: topPick(aggregate, "projection"),
    gender: topPick(aggregate, "gender"),
    value: topPick(aggregate, "value"),
  };
}

/** Cheapest live listing price; decants count at their smallest size, like the listings table. */
export async function fetchLowestPrice(
  perfume: Pick<PerfumeProfile, "name" | "search_terms">
): Promise<number | null> {
  const terms = perfume.search_terms.length > 0 ? perfume.search_terms : [perfume.name];
  const filter = terms.map((t) => `perfume_name.ilike.%${t}%`).join(",");
  const { data, error } = await createPublicSupabase()
    .from("listings")
    .select("price, min_price, type")
    .or(filter)
    .eq("is_hidden", false)
    .limit(20);
  if (error) return null;
  const prices = (data ?? [])
    .map((l) =>
      (l.type ?? "").toLowerCase() === "decant" && l.min_price != null
        ? Number(l.min_price)
        : Number(l.price ?? NaN)
    )
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export async function fetchPerfumeSnapshot(perfume: PerfumeProfile): Promise<PerfumeSnapshot> {
  const [aggregate, lowPrice] = await Promise.all([
    fetchPerfumeReviewAggregate(perfume.id).catch(() => EMPTY_AGGREGATE),
    fetchLowestPrice(perfume),
  ]);
  return snapshotFromAggregate(aggregate, lowPrice);
}
