import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";

export type Review = {
  id: string;
  user_id: string;
  perfume_name: string;
  brand: string;
  category: string;
  sub_category: string | null;
  images: string[];
  review_text: string | null;
  rating: "love" | "like" | "okay" | "dislike" | "hate" | null;
  when_to_wear: string[];
  gender: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  longevity: "0-2h" | "2-5h" | "5-7h" | "7-10h" | "10h+" | null;
  created_at: string;
  updated_at: string;
};

export type ReviewInsert = Omit<Review, "id" | "user_id" | "created_at" | "updated_at">;

export async function fetchMyReviews(): Promise<Review[]> {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertReview(input: ReviewInsert): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase.from("reviews").insert({
    ...input,
    user_id: userId,
  });
  if (error) throw error;
}

export async function updateReview(
  id: string,
  input: Partial<ReviewInsert>
): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}
