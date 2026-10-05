import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import PartialsClient from "./PartialsClient";
import type { PerfumeListing, SellerProfile } from "@/types/perfume";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Partial Perfumes in Bangladesh — Drop Your Partials",
  description:
    "Partial perfume bottles for sale across Bangladesh, listed by real sellers. Browse what's up for grabs, or drop your own partial in a minute.",
  alternates: { canonical: "https://www.cloudperfumebd.com/partials" },
};

type RawListing = Omit<PerfumeListing, "profiles"> & {
  profiles?: SellerProfile[] | SellerProfile | null;
};

async function fetchPartials(): Promise<PerfumeListing[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      perfume_id,
      brand,
      perfume_name,
      sub_brand,
      price,
      min_price,
      type,
      bottle_size_ml,
      partial_left_ml,
      decant_options,
      images,
      profiles:profiles!inner (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("is_hidden", false)
    .eq("type", "partial")
    .order("created_at", { ascending: false });

  if (error) return [];

  return ((data as RawListing[]) ?? []).map((l) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? l.profiles[0] ?? null : l.profiles ?? null,
  }));
}

export default async function PartialsPage() {
  const listings = await fetchPartials();
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PartialsClient listings={listings} />
    </Suspense>
  );
}
