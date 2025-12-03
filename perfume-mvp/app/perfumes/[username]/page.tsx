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

  // Get profile by username (now with contact fields)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      avatar_url,
      contact_number,
      bio,
      whatsapp_number,
      messenger_link,
      facebook_link
    `)
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


  const listingsWithProfile = (listings ?? []).map((l) => ({
    ...l,
    profiles: {
      username: profile.username,
      display_name: profile.display_name,
    },
  }));

  // ✅ check if there is any contact data
  const hasAnyContact =
    !!profile.whatsapp_number ||
    !!profile.messenger_link ||
    !!profile.facebook_link ||
    !!profile.contact_number;

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-20">
        {/* Seller header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
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

          {/* Contact area (buttons + warning) */}
          <div className="space-y-2">
            {!hasAnyContact && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs md:text-sm px-3 py-2 rounded-lg max-w-md">
                This seller hasn’t shared any contact details yet. Please be
                careful when making any deal and avoid sending money without
                proper verification.
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {profile.whatsapp_number && (
                <a
                  href={`https://wa.me/${profile.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-green-600 text-white px-3 py-1.5 text-xs md:text-sm"
                >
                  WhatsApp
                </a>
              )}

              {profile.messenger_link && (
                <a
                  href={profile.messenger_link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-600 text-white px-3 py-1.5 text-xs md:text-sm"
                >
                  Messenger
                </a>
              )}

              {profile.facebook_link && (
                <a
                  href={profile.facebook_link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-700 text-white px-3 py-1.5 text-xs md:text-sm"
                >
                  Facebook
                </a>
              )}

              {profile.contact_number && (
                <a
                  href={`tel:${profile.contact_number}`}
                  className="rounded-full bg-gray-900 text-white px-3 py-1.5 text-xs md:text-sm"
                >
                  Call
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Listings grid */}
        <UsernameListingGrid
          listings={listingsWithProfile}
          emptyText="This seller has no active listings."
        />
      </section>
    </div>
  );
}
