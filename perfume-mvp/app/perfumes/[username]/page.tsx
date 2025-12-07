// app/perfumes/[username]/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Header from "@/components/Header";
import { UsernameListingGrid } from "./components/UsernameListingGrid";
import { Facebook, MessageSquare, Phone, User } from "lucide-react";

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
    <div className="min-h-screen bg-[#fcfaf7]"> {/* Added subtle bg color to body */}
      <Header />
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-20">
        {/* Seller header */}
        <div className="mb-8 flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? profile.username}
                className="h-16 w-16 rounded-full object-cover border border-black/10 shadow-sm"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border border-black/10">
                    <User className="h-6 w-6 text-gray-400" />
                </div>
            )}
            <div>
              <h1 className="text-3xl font-serif font-medium text-[#1a1a1a]">
                {profile.display_name ?? profile.username}
              </h1>
              {profile.bio && (
                <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>
              )}
                <p className="text-xs text-gray-400 mt-1">@{profile.username}</p>
            </div>
          </div>

          {/* Contact area (buttons + warning) */}
          <div className="space-y-3">
            {!hasAnyContact && (
              <div className="bg-white border border-yellow-300 text-yellow-800 text-xs md:text-sm px-4 py-3 rounded-xl max-w-lg shadow-sm">
                <span className="font-semibold">⚠️ Seller Note:</span> This seller hasn’t shared contact details. Proceed with caution and verify transactions carefully.
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {profile.whatsapp_number && (
                <a
                  href={`https://wa.me/${profile.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full bg-[#34A853] text-white px-4 py-2 text-sm font-medium hover:bg-[#2d9146] transition"
                >
                    <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </a>
              )}

              {profile.messenger_link && (
                <a
                  href={profile.messenger_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full bg-[#0078FF] text-white px-4 py-2 text-sm font-medium hover:bg-[#0063d3] transition"
                >
                    <MessageSquare className="h-4 w-4" />
                  Messenger
                </a>
              )}

              {profile.facebook_link && (
                <a
                  href={profile.facebook_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full bg-[#1877F2] text-white px-4 py-2 text-sm font-medium hover:bg-[#156cdb] transition"
                >
                    <Facebook className="h-4 w-4" />
                  Facebook
                </a>
              )}

              {profile.contact_number && (
                <a
                  href={`tel:${profile.contact_number}`}
                  className="flex items-center gap-2 rounded-full bg-[#1a1a1a] text-white px-4 py-2 text-sm font-medium hover:bg-black transition"
                >
                    <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-light text-[#1a1a1a] mb-6">
            Active Listings by {profile.display_name ?? profile.username}
        </h2>
        {/* Listings grid */}
        <UsernameListingGrid
          listings={listingsWithProfile}
          emptyText="This seller has no active listings."
        />
      </section>
    </div>
  );
}
