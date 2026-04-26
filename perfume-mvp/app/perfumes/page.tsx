import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import PerfumesPage from "./components/PerfumePage";
import type { Metadata } from "next";
import type { PerfumeListing, SellerProfile } from "@/types/perfume";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Browse Perfumes — Buy & Sell Fragrances in Bangladesh",
  description:
    "Explore hundreds of genuine perfume listings from sellers across Bangladesh. Find full bottles, partials, and decants at community-driven prices.",
  alternates: { canonical: "https://cloudperfumebd.com/perfumes" },
};

type RawListing = Omit<PerfumeListing, "profiles"> & {
  profiles?: SellerProfile[] | SellerProfile | null;
};

async function fetchInitialListings(): Promise<PerfumeListing[]> {
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
        avatar_url,
        contact_number,
        messenger_link,
        whatsapp_number
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return [];

  const rows = (data as RawListing[]) ?? [];
  return rows.map((l) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? l.profiles[0] ?? null : l.profiles ?? null,
  }));
}

export default async function Page() {
  const initialListings = await fetchInitialListings();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PerfumesPage initialListings={initialListings} />
    </Suspense>
  );
}
