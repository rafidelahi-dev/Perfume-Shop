import { supabase } from "@/lib/supabaseClient";

export async function fetchTrendingNow() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select(
      "id, brand, perfume_name, sub_brand, min_price, representative_images, click_score, last_clicked_at"
    )
    .order("click_score", { ascending: false })
    .order("last_clicked_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingWeek() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte(
      "last_clicked_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    )
    .order("click_score", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingMonth() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte("last_clicked_at", startOfMonth.toISOString())
    .order("click_score", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingBrands() {
  const { data, error } = await supabase.rpc("get_trending_brands").limit(9);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicPerfumes() {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id, perfume_id, brand, perfume_name, sub_brand, price, min_price,
      type, bottle_size_ml, partial_left_ml, decant_options, images,
      profiles:profiles!inner(
        id, username, display_name, avatar_url,
        contact_number, messenger_link, whatsapp_number
      )
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
