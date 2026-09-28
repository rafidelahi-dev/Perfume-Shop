import { createClient } from "@supabase/supabase-js";

export function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type PerfumeProfile = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  meta_title: string | null;
  meta_description: string | null;
  top_notes: string[];
  heart_notes: string[];
  base_notes: string[];
  accords: string[];
  search_terms: string[];
  gender_lean: "very_masculine" | "masculine" | "unisex" | "feminine" | "very_feminine" | null;
  house_description: string | null;
  is_verified: boolean;
  authenticity_batch_code: string | null;
  authenticity_packaging_notes: string | null;
  authenticity_other_notes: string | null;
};

const PROFILE_COLUMNS =
  "id, slug, name, brand, meta_title, meta_description, top_notes, heart_notes, base_notes, accords, search_terms, gender_lean, house_description, is_verified, authenticity_batch_code, authenticity_packaging_notes, authenticity_other_notes";

export async function fetchAllPerfumeSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.from("perfumes").select("slug");
  if (error) {
    console.error("[perfumes] fetchAllPerfumeSlugs failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchPerfumeBySlug(slug: string): Promise<PerfumeProfile | null> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("perfumes")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[perfumes] fetchPerfumeBySlug failed:", error.message);
    return null;
  }
  return data as PerfumeProfile | null;
}

export async function fetchSimilarPerfumes(
  perfume: Pick<PerfumeProfile, "id" | "brand" | "accords">,
  limit = 6
): Promise<PerfumeProfile[]> {
  if (perfume.accords.length === 0) return [];

  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("perfumes")
    .select(PROFILE_COLUMNS)
    .overlaps("accords", perfume.accords)
    .neq("id", perfume.id)
    .limit(40);

  if (error) {
    console.error("[perfumes] fetchSimilarPerfumes failed:", error.message);
    return [];
  }

  const candidates = (data ?? []) as PerfumeProfile[];
  return candidates
    .map((c) => {
      const shared = c.accords.filter((a) => perfume.accords.includes(a)).length;
      const brandBonus = c.brand === perfume.brand ? 1 : 0;
      return { entry: c, score: shared * 2 + brandBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export type ReviewAggregate = {
  review_count: number;
  longevity_counts: Record<string, number>;
  gender_counts: Record<string, number>;
  occasion_counts: Record<string, number>;
  rating_avg: number | null;
  rating_count: number;
  climate_counts: Record<string, number>;
  environment_counts: Record<string, number>;
};

export async function fetchPerfumeReviewAggregate(perfumeId: string): Promise<ReviewAggregate> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .rpc("get_perfume_review_aggregate", { p_perfume_id: perfumeId })
    .single();

  if (error || !data) {
    console.error("[perfumes] fetchPerfumeReviewAggregate failed:", error?.message);
    return {
      review_count: 0,
      longevity_counts: {},
      gender_counts: {},
      occasion_counts: {},
      rating_avg: null,
      rating_count: 0,
      climate_counts: {},
      environment_counts: {},
    };
  }
  return data as ReviewAggregate;
}

export type PricePoint = { month: string; avg_price: number };

export async function fetchPerfumePriceHistory(perfumeId: string): Promise<PricePoint[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.rpc("get_perfume_price_history", {
    p_perfume_id: perfumeId,
  });

  if (error) {
    console.error("[perfumes] fetchPerfumePriceHistory failed:", error.message);
    return [];
  }
  return (data ?? []) as PricePoint[];
}

export async function submitDemandRequest(
  perfumeId: string,
  requestType: "notify" | "decant"
): Promise<void> {
  const supabase = createPublicSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("demand_requests").insert({
    perfume_id: perfumeId,
    request_type: requestType,
    user_id: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}
