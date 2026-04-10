import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export async function fetchMyListings() {
  const userId = await getSessionUserId();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchListingById(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertListing(values: Record<string, unknown>) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .insert({ user_id: userId, ...values });
  if (error) throw error;
}

export async function fetchPublicListings(filters: {
  brand?: string;
  q?: string;
}) {
  let query = supabase
    .from("listings")
    .select(`*, profiles:profiles(display_name, username)`)
    .order("created_at", { ascending: false });
  if (filters.brand) query = query.ilike("brand", `%${filters.brand}%`);
  if (filters.q)
    query = query.or(
      `perfume_name.ilike.%${filters.q}%,brand.ilike.%${filters.q}%,sub_brand.ilike.%${filters.q}%`
    );
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function deleteMyListing(id: string) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function uploadListingImage(
  file: File,
  userId: string
): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}
