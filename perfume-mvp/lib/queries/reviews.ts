import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";
import type { UserVote } from "@/lib/polls";
import type { PublicReview, ReviewAggregate } from "./perfumes";

export type MyReview = {
  id: string;
  perfume_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text: string | null;
  images: string[];
  owns_bottle: boolean;
  knows_seller: boolean;
  is_anonymous: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  perfumes: { name: string; brand: string; slug: string } | null;
};

export type ReviewDetails = {
  review_text: string | null;
  images: string[];
  owns_bottle: boolean;
  knows_seller: boolean;
  is_anonymous: boolean;
};

export type MyPerfumeState = {
  review: (Omit<MyReview, "perfumes" | "is_flagged" | "flag_reason"> & { user_id?: string }) | null;
  votes: UserVote[];
};

const MY_REVIEW_COLUMNS =
  "id, perfume_id, rating, review_text, images, owns_bottle, knows_seller, is_anonymous, is_flagged, flag_reason, is_hidden, created_at, updated_at, perfumes(name, brand, slug)";

export async function fetchMyReviews(): Promise<MyReview[]> {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("reviews")
    .select(MY_REVIEW_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyReview[];
}

export async function fetchMyPerfumeState(perfumeId: string): Promise<MyPerfumeState> {
  const { data, error } = await supabase.rpc("get_my_perfume_state", {
    p_perfume_id: perfumeId,
  });
  if (error) throw error;
  const state = (data ?? {}) as Partial<MyPerfumeState>;
  return { review: state.review ?? null, votes: state.votes ?? [] };
}

/** Tapping a star: update the caller's review if one exists, otherwise create it. */
export async function saveRating(perfumeId: string, rating: number): Promise<void> {
  const userId = await getSessionUserId();

  const update = async () =>
    supabase
      .from("reviews")
      .update({ rating })
      .eq("user_id", userId)
      .eq("perfume_id", perfumeId)
      .select("id");

  const first = await update();
  if (first.error) throw first.error;
  if (first.data && first.data.length > 0) return;

  const { error } = await supabase
    .from("reviews")
    .insert({ user_id: userId, perfume_id: perfumeId, rating });
  if (!error) return;

  // Lost a race with another tab (unique violation): the row exists now.
  if (error.code === "23505") {
    const retry = await update();
    if (retry.error) throw retry.error;
    return;
  }
  throw error;
}

export async function updateReviewDetails(id: string, details: ReviewDetails): Promise<void> {
  const { error } = await supabase.from("reviews").update(details).eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase.from("reviews").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function castVote(
  perfumeId: string,
  dimension: string,
  option: string,
  value: -1 | 0 | 1
): Promise<void> {
  const { error } = await supabase.rpc("cast_vote", {
    p_perfume_id: perfumeId,
    p_dimension: dimension,
    p_option: option,
    p_value: value,
  });
  if (error) throw error;
}

/** Browser-side refetch of the public aggregate + list after a mutation. */
export async function fetchFeedbackPublic(perfumeId: string): Promise<{
  aggregate: ReviewAggregate;
  reviews: PublicReview[];
}> {
  const [agg, list] = await Promise.all([
    supabase.rpc("get_perfume_review_aggregate", { p_perfume_id: perfumeId }).single(),
    supabase.rpc("get_perfume_reviews", { p_perfume_id: perfumeId }),
  ]);
  if (agg.error) throw agg.error;
  if (list.error) throw list.error;
  const row = agg.data as ReviewAggregate;
  return {
    aggregate: {
      ...row,
      review_count: Number(row.review_count),
      rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
    },
    reviews: (list.data ?? []) as PublicReview[],
  };
}

export async function reportReview(reviewId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("report_review", {
    p_review_id: reviewId,
    p_reason: reason,
  });
  if (error) throw error;
}

export type ReviewActivity = {
  perfume_id: string;
  name: string;
  brand: string;
  slug: string;
  my_rating: number;
  other_reviews: number;
  other_voters: number;
  new_reviews_7d: number;
  new_votes_7d: number;
};

export type PerfumeToRate = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  review_count: number;
};

export async function fetchMyReviewActivity(): Promise<ReviewActivity[]> {
  const { data, error } = await supabase.rpc("get_my_review_activity");
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as ReviewActivity),
    other_reviews: Number(r.other_reviews),
    other_voters: Number(r.other_voters),
    new_reviews_7d: Number(r.new_reviews_7d),
    new_votes_7d: Number(r.new_votes_7d),
  }));
}

export async function fetchPerfumesToRate(limit = 6): Promise<PerfumeToRate[]> {
  const { data, error } = await supabase.rpc("get_perfumes_to_rate", { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as PerfumeToRate),
    review_count: Number(r.review_count),
  }));
}
