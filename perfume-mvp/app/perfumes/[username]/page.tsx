// server component
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer"; // you already have this
import { ListingGrid } from "@/app/dashboard/listings/listingComponents/ListingGrid";   // reuse your existing grid (or PerfumeGrid)
import Header from "@/components/Header";


type Params = { username: string };

export default async function SellerListingsPage(
  props: { params: Promise<Params> }
) {
  const { username } = await props.params;   // ✅ await params
  const supabase = await createServerSupabase();

  // Ensure auth (if not using middleware)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/login?next=/perfumes/${username}`);
  }

  // Get profile by username
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, contact_link, bio")
    .eq("username", username)
    .single();
    console.log(profile)
  if (pErr || !profile) redirect("/perfumes"); // fallback

  // Get seller's active listings
  const { data: listings, error: lErr } = await supabase
    .from("listings")
    .select("id, brand, perfume_name, sub_brand, price, type, min_price, images")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  console.log("LISTINGS ERROR:", lErr);
  console.log("LISTINGS DATA:", listings);

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
              className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gray-200" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">
              {profile.display_name ?? profile.username}
            </h1>
            {profile.bio && <p className="text-sm text-gray-600">{profile.bio}</p>}
          </div>
        </div>

        {/* Reuse your grid; add seller name in the card if desired */}
        <ListingGrid
          listings={(listings ?? []).map((l) => ({
            ...l,
            profiles: { username: profile.username, display_name: profile.display_name },
          }))}
          emptyText="This seller has no active listings."
        />
      </section>
    </div>
  );
}
