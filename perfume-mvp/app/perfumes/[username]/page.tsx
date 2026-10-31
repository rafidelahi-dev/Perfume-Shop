// app/perfumes/[username]/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Header from "@/components/Header";

export const revalidate = 300;

function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
import { UsernameListingGrid } from "./components/UsernameListingGrid";
import SellerRatingSection from "@/components/reviews/SellerRatingSection";
import SellerPassHeader from "@/components/profile/SellerPassHeader";
import ProfileTabs from "@/components/profile/ProfileTabs";
import JoinBar from "@/components/profile/JoinBar";
import { fetchSellerPass, tierLabel } from "@/lib/sellerPass";
import type { PublicSellerReview } from "@/lib/queries/sellerReviews";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const pass = await fetchSellerPass(username);

  if (!pass) {
    return { title: "Seller Not Found | CloudPerfumeBD" };
  }

  const displayName = pass.displayName;
  const title = `${displayName}'s Perfumes | CloudPerfumeBD`;
  const standing = [
    pass.tier ? tierLabel(pass.tier, pass.isEarly) : null,
    pass.ratingAvg != null && pass.ratingCount > 0
      ? `${pass.ratingAvg.toFixed(1)}★ from ${pass.ratingCount} review${pass.ratingCount > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean).join(", ");
  const base = pass.bio
    ? `${pass.bio} — Browse ${displayName}'s perfume listings on CloudPerfumeBD.`
    : `Browse ${displayName}'s perfume listings on CloudPerfumeBD.`;
  const description = standing ? `${standing}. ${base}` : base;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SellerListingsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createPublicSupabase();

  const pass = await fetchSellerPass(username);
  if (!pass) redirect("/perfumes");

  const [{ data: profile }, { data: listings, error: lErr }, { data: sellerReviews }] = await Promise.all([
    supabase
      .from("profiles")
      .select("contact_number, whatsapp_number, messenger_link, facebook_link, website")
      .eq("id", pass.sellerId)
      .single(),
    supabase
      .from("listings")
      .select("id, brand, perfume_name, sub_brand, price, type, min_price, images")
      .eq("user_id", pass.sellerId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_seller_reviews", { p_seller_id: pass.sellerId }),
  ]);

  if (lErr) console.error("LISTINGS ERROR:", lErr);

  const listingsWithProfile = (listings ?? []).map((l) => ({
    ...l,
    profiles: { username: pass.username, display_name: pass.displayName },
  }));

  return (
    <div className="min-h-screen bg-[#fcfaf7] pb-20">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-20">
        <SellerPassHeader
          pass={pass}
          contact={{
            whatsapp: profile?.whatsapp_number ?? null,
            messenger: profile?.messenger_link ?? null,
            facebook: profile?.facebook_link ?? null,
            phone: profile?.contact_number ?? null,
            website: profile?.website ?? null,
          }}
        />
        <ProfileTabs
          listingCount={pass.listingCount}
          reviewCount={pass.ratingCount}
          listings={
            <UsernameListingGrid listings={listingsWithProfile} emptyText="This seller has no active listings." />
          }
          reviews={
            <SellerRatingSection
              sellerId={pass.sellerId}
              username={pass.username}
              sellerName={pass.displayName}
              initialRating={{ rating_count: pass.ratingCount, rating_avg: pass.ratingAvg }}
              initialReviews={(sellerReviews ?? []) as PublicSellerReview[]}
            />
          }
        />
      </section>
      <JoinBar username={pass.username} />
    </div>
  );
}
