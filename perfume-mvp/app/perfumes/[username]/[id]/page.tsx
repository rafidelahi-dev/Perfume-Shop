// server component
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Header from "@/components/Header";
import DecantOptions from "../../components/DecantOptions";// you created this earlier

type Props = { params: { username: string; id: string } };

export default async function ListingDetailPage({ params }: Props) {
  const { username, id } = params;
  const supabase = createServerSupabase();

  // Ensure auth (if not using middleware)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/login?next=/perfumes/${username}/${id}`);
  }

  // Find seller by username
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, contact_number, whatsapp_number, messenger_link, facebook_link, bio")
    .eq("username", username)
    .single();
  if (pErr || !profile) redirect("/perfumes");

  // Fetch the listing (and ensure it belongs to that profile)
  const { data: listing, error: lErr } = await supabase
    .from("listings")
    .select(`
      id, brand, perfume_name, sub_brand,
      type, price, min_price, decant_options,
      images, created_at
    `)
    .eq("id", id)
    .eq("user_id", profile.id)
    .single();
  if (lErr || !listing) redirect(`/perfumes/${username}`);

  const hasAnyContact =
  !!profile.whatsapp_number ||
  !!profile.messenger_link ||
  !!profile.facebook_link ||
  !!profile.contact_number;


  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceToShow =
    isDecant && listing.min_price != null ? Number(listing.min_price) : Number(listing.price ?? NaN);

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-20 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          {(listing.images ?? []).length ? (
            <div className="grid grid-cols-3 gap-3">
              {(listing.images as string[]).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={listing.perfume_name ?? "Perfume"} className="rounded-xl object-cover w-full h-44" />
              ))}
            </div>
          ) : (
            <div className="h-72 rounded-xl bg-gray-100" />
          )}
        </div>

        {/* Content */}
        <div>
          <h1 className="text-2xl font-semibold">{listing.brand} {listing.sub_brand && `– ${listing.sub_brand}`}</h1>
          <p className="text-gray-700">{listing.perfume_name}</p>

          <div className="mt-4">
            <span className="text-[#d4af37] text-2xl font-bold">
              {Number.isFinite(priceToShow) ? `$${priceToShow.toFixed(2)}` : "—"}
            </span>
            <span className="ml-2 text-xs rounded-full bg-[#fff6dc] border border-[#d4af37]/40 px-2 py-0.5 text-[#6b5600]">
              {(listing.type ?? "").toUpperCase()}
            </span>
          </div>

          {isDecant && Array.isArray(listing.decant_options) && listing.decant_options.length > 0 && (
            <div className="mt-3">
              <DecantOptions options={listing.decant_options} maxInline={3} />
            </div>
          )}

          {/* Seller card */}
          <div className="mt-8 rounded-xl border p-4 bg-white">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
                  className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200" />
              )}
              <div>
                <div className="font-medium">{profile.display_name ?? profile.username}</div>
                {profile.bio && <div className="text-xs text-gray-500">{profile.bio}</div>}
              </div>
            </div>


            {!hasAnyContact && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-3 py-2 rounded-lg">
                This seller hasn’t added any contact details yet.  
                <br />
                Please be cautious and avoid making commitments without proper verification.
              </div>
            )}

            {/* Contact buttons: adapt to your actual columns */}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.whatsapp_number && (
                <a
                  href={`https://wa.me/${profile.whatsapp_number}`}
                  target="_blank" rel="noreferrer"
                  className="rounded-full bg-green-600 text-white px-3 py-1.5 text-sm"
                >
                  WhatsApp
                </a>
              )}
              {profile.messenger_link && (
                <a href={profile.messenger_link} target="_blank" rel="noreferrer"
                  className="rounded-full bg-blue-600 text-white px-3 py-1.5 text-sm">
                  Messenger
                </a>
              )}

              {profile.facebook_link && (
                <a
                  href={profile.facebook_link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-700 text-white px-3 py-1.5 text-sm"
                >
                  Facebook
                </a>
              )}

              {profile.contact_number && (
                <a href={profile.contact_number} target="_blank" rel="noreferrer"
                  className="rounded-full bg-gray-900 text-white px-3 py-1.5 text-sm">
                  Contact
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
