import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import PerfumeGrid from "@/app/perfumes/components/PerfumeGrid";
import type { PerfumeListing, SellerProfile } from "@/types/perfume";

type RawListing = Omit<PerfumeListing, "profiles"> & {
  profiles?: SellerProfile[] | SellerProfile | null;
};

// Stats only appear once the numbers look healthy; a "3 posts" counter hurts more than it helps.
const MIN_POSTS_FOR_STATS = 10;

async function fetchJustDropped() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [latest, total, today, sellerRows] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, perfume_id, brand, perfume_name, sub_brand, price, min_price, type,
         bottle_size_ml, partial_left_ml, decant_options, images, created_at, status,
         profiles:profiles!inner (id, username, display_name, avatar_url, phone_verified)`
      )
      .eq("is_hidden", false)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false)
      .eq("status", "available"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false)
      .eq("status", "available")
      .gte("created_at", since),
    supabase.from("listings").select("user_id").eq("is_hidden", false).eq("status", "available").limit(2000),
  ]);

  const listings = ((latest.data as RawListing[] | null) ?? []).map((l) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? l.profiles[0] ?? null : l.profiles ?? null,
  })) as PerfumeListing[];

  return {
    listings,
    total: total.count ?? 0,
    today: today.count ?? 0,
    sellers: new Set((sellerRows.data ?? []).map((r) => r.user_id)).size,
  };
}

export default async function JustDropped() {
  const { listings, total, today, sellers } = await fetchJustDropped();
  if (listings.length === 0) return null;

  const stats: string[] = [];
  if (total >= MIN_POSTS_FOR_STATS) {
    stats.push(`${total} sell posts`, `${sellers} sellers`);
    if (today > 0) stats.push(`${today} new today`);
  }

  return (
    <section className="bg-[#fdfbf7] px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#1a1a1a] sm:text-4xl">Just dropped</h2>
            {stats.length > 0 && (
              <p className="mt-1 text-sm text-[#666]">{stats.join(" · ")}</p>
            )}
          </div>
          <Link
            href="/perfumes"
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#1a1a1a]/15 px-5 text-sm font-medium text-[#1a1a1a] transition hover:border-[#d4af37] hover:bg-white"
          >
            See all sell posts
          </Link>
        </div>
        <PerfumeGrid perfumes={listings} isLoading={false} error={null} />
      </div>
    </section>
  );
}
