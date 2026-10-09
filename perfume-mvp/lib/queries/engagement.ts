// Client-side queries for sold status, alerts, follows, reports and wanted requests.
// RLS enforces ownership; these helpers only shape the calls.
import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";

async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Please log in first.");
  return userId;
}

// ---- Sold / available -------------------------------------------------------
export async function setListingSold(id: string, sold: boolean) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("listings")
    .update({ status: sold ? "sold" : "available", sold_at: sold ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---- Alerts ("notify me") ---------------------------------------------------
export type PerfumeAlert = { id: string; query: string; created_at: string; last_seen_at: string };

export async function createAlert(query: string) {
  const userId = await requireUserId();
  const q = query.trim().slice(0, 80);
  if (q.length < 2) throw new Error("Type at least 2 letters.");
  const { error } = await supabase
    .from("perfume_alerts")
    .upsert({ user_id: userId, query: q }, { onConflict: "user_id,query", ignoreDuplicates: true });
  if (error) throw error;
}

export async function fetchMyAlerts(): Promise<PerfumeAlert[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("perfume_alerts")
    .select("id, query, created_at, last_seen_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteAlert(id: string) {
  const userId = await requireUserId();
  const { error } = await supabase.from("perfume_alerts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// ---- Follows ----------------------------------------------------------------
export async function isFollowingSeller(sellerId: string): Promise<boolean> {
  const userId = await getSessionUserId();
  if (!userId) return false;
  const { data, error } = await supabase
    .from("seller_follows")
    .select("seller_id")
    .eq("follower_id", userId)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setFollowSeller(sellerId: string, follow: boolean) {
  const userId = await requireUserId();
  if (follow) {
    const { error } = await supabase
      .from("seller_follows")
      .upsert({ follower_id: userId, seller_id: sellerId }, { onConflict: "follower_id,seller_id", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("seller_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("seller_id", sellerId);
    if (error) throw error;
  }
}

export type FollowedSeller = {
  seller_id: string;
  last_seen_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function fetchMyFollows(): Promise<FollowedSeller[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("seller_follows")
    .select("seller_id, last_seen_at, profiles:profiles!seller_follows_seller_id_fkey(username, display_name, avatar_url)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<FollowedSeller, "profiles"> & {
    profiles: FollowedSeller["profiles"] | NonNullable<FollowedSeller["profiles"]>[];
  })[]).map((r) => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
  }));
}

// ---- Reports ----------------------------------------------------------------
export async function reportListing(listingId: string, reason: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("listing_reports")
    .insert({ listing_id: listingId, reporter_id: userId, reason: reason.trim().slice(0, 300) });
  if (error) {
    if (error.code === "23505") return; // already reported by this user
    throw error;
  }
}

// ---- Wanted requests --------------------------------------------------------
export type WantedRequest = {
  id: string;
  user_id: string;
  perfume_text: string;
  type: string | null;
  max_price: number | null;
  note: string | null;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    contact_number: string | null;
    whatsapp_number: string | null;
    messenger_link: string | null;
  } | null;
};

const WANTED_SELECT =
  "id, user_id, perfume_text, type, max_price, note, created_at, profiles:profiles!wanted_requests_user_id_profiles_fkey(username, display_name, avatar_url, contact_number, whatsapp_number, messenger_link)";

export async function createWanted(input: {
  perfume_text: string;
  type: string | null;
  max_price: number | null;
  note: string | null;
}) {
  const userId = await requireUserId();
  const { error } = await supabase.from("wanted_requests").insert({
    user_id: userId,
    perfume_text: input.perfume_text.trim().slice(0, 100),
    type: input.type,
    max_price: input.max_price,
    note: input.note?.trim().slice(0, 300) || null,
  });
  if (error) throw error;
}

export async function closeWanted(id: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("wanted_requests")
    .update({ is_open: false })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export { WANTED_SELECT };
