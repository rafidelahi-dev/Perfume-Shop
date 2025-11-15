// app/perfumes/[username]/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Header from "@/components/Header";
import { UsernameListingGrid } from "./components/UsernameListingGrid";

type Params = { username: string };

export default async function SellerListingsPage({
  params,
}: {
  params: Params;
}) {
  const { username } = params;
  const supabase = await createServerSupabase();

  // Auth gate (if you want this page to require login)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/login?next=/perfumes/${username}`);
  }

  // Get profile by username
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, contact_link, bio")
    .eq("username", username)
    .single();

  if (pErr || !profile) {
    console.error("PROFILE ERROR:", pErr);
    redirect("/perfumes");
  }

  // Get seller's listings
  const { data: listings, error: lErr } = await supabase
    .from("listings")
    .select(
      "id, brand, perfume_name, sub_brand, price, type, min_price, images"
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  console.log("LISTINGS ERROR:", lErr);
  console.log("LISTINGS DATA:", listings);

  const listingsWithProfile = (listings ?? []).map((l) => ({
    ...l,
    profiles: {
      username: profile.username,
      display_name: profile.display_name,
    },
  }));

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.username}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gray-200" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">
              {profile.display_name ?? profile.username}
            </h1>
            {profile.bio && (
              <p className="text-sm text-gray-600">{profile.bio}</p>
            )}
          </div>
        </div>

        <UsernameListingGrid
          listings={listingsWithProfile}
          emptyText="This seller has no active listings."
        />
      </section>
    </div>
  );
}
