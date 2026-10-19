import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";

export type SellerRating = { rating_count: number; rating_avg: number | null };

export type PublicSellerReview = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  display_name: string;
  created_at: string;
};

export type MySellerReview = { id: string; rating: 1 | 2 | 3 | 4 | 5; comment: string | null };

export async function fetchSellerFeedback(sellerId: string): Promise<{
  rating: SellerRating;
  reviews: PublicSellerReview[];
}> {
  const [r, list] = await Promise.all([
    supabase.rpc("get_seller_rating", { p_seller_id: sellerId }).single(),
    supabase.rpc("get_seller_reviews", { p_seller_id: sellerId }),
  ]);
  if (r.error) throw r.error;
  if (list.error) throw list.error;
  const row = r.data as { rating_count: number | string; rating_avg: number | string | null };
  return {
    rating: {
      rating_count: Number(row.rating_count),
      rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
    },
    reviews: (list.data ?? []) as PublicSellerReview[],
  };
}

export async function fetchMySellerReview(sellerId: string): Promise<MySellerReview | null> {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("seller_reviews")
    .select("id, rating, comment")
    .eq("seller_id", sellerId)
    .eq("reviewer_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as MySellerReview | null) ?? null;
}

/** Stars alone is valid; comment is only touched when provided. */
export async function saveSellerReview(
  sellerId: string,
  rating: number,
  comment?: string | null
): Promise<void> {
  const userId = await getSessionUserId();
  const patch = comment === undefined ? { rating } : { rating, comment };

  const update = async () =>
    supabase
      .from("seller_reviews")
      .update(patch)
      .eq("seller_id", sellerId)
      .eq("reviewer_id", userId)
      .select("id");

  const first = await update();
  if (first.error) throw first.error;
  if (first.data && first.data.length > 0) return;

  const { error } = await supabase
    .from("seller_reviews")
    .insert({ seller_id: sellerId, reviewer_id: userId, ...patch });
  if (!error) return;
  if (error.code === "23505") {
    const retry = await update();
    if (retry.error) throw retry.error;
    return;
  }
  throw error;
}

export async function deleteSellerReview(id: string): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("seller_reviews")
    .delete()
    .eq("id", id)
    .eq("reviewer_id", userId);
  if (error) throw error;
}

export async function reportSellerReview(reviewId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("report_seller_review", {
    p_review_id: reviewId,
    p_reason: reason,
  });
  if (error) throw error;
}
