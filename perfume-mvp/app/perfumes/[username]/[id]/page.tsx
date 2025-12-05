// server component
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Header from "@/components/Header";
import DecantOptions from "../../components/DecantOptions"; // assuming this component is well-designed

// ** Importing relevant icons for contact buttons to improve UX **
import { Phone, MessageCircle, Facebook, Zap } from 'lucide-react'; // Using lucide-react for icons

type Props = { params: { username: string; id: string } };

export default async function ListingDetailPage({ params }: Props) {
  const { username, id } = params;
  const supabase = createServerSupabase();

  // --- Data Fetching and Authorization ---

  // 1. Ensure auth (if not using middleware)
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect(`/login?next=/perfumes/${username}/${id}`);
  }

  // 2. Find seller by username
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, contact_number, whatsapp_number, messenger_link, facebook_link, bio")
    .eq("username", username)
    .single();
  if (pErr || !profile) redirect("/perfumes");

  // 3. Fetch the listing (and ensure it belongs to that profile)
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

  // --- Calculated Properties ---

  const hasAnyContact =
    !!profile.whatsapp_number ||
    !!profile.messenger_link ||
    !!profile.facebook_link ||
    !!profile.contact_number;

  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceToShow =
    isDecant && listing.min_price != null ? Number(listing.min_price) : Number(listing.price ?? NaN);

  // --- Component Rendering ---

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-24">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* 1. Images Section (Left Column) */}
          <div className="lg:sticky lg:top-24 space-y-4">
            {(listing.images ?? []).length > 0 ? (
              <>
                {/* Main Image (First image, larger) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(listing.images as string[])[0]}
                  alt={listing.perfume_name ?? "Perfume"}
                  className="rounded-xl object-cover w-full h-[400px] shadow-lg border border-gray-200"
                />
                
                {/* Thumbnails */}
                {/* Show up to 3 more thumbnails */}
                <div className="grid grid-cols-3 gap-4">
                  {(listing.images as string[]).slice(1, 4).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${listing.perfume_name} thumbnail ${i + 2}`}
                      className="rounded-lg object-cover w-full h-28 opacity-90 hover:opacity-100 transition duration-150 cursor-pointer"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[400px] w-full rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 shadow-lg border border-gray-300">
                <Zap className="w-8 h-8 mr-2" /> No Images Available
              </div>
            )}
          </div>

          {/* 2. Content & Seller Section (Right Column) */}
          <div className="space-y-6">
            
            {/* Listing Details */}
            <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
                    {listing.brand}
                  </h1>
                  {listing.sub_brand && (
                    <span className="text-lg font-medium text-gray-500">
                      — {listing.sub_brand}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isDecant ? "bg-indigo-100 text-indigo-800" : "bg-teal-100 text-teal-800"}`}>
                  {(listing.type ?? "").toUpperCase()}
                </span>
              </div>
              
              <p className="text-xl text-gray-700 font-light border-b pb-4">{listing.perfume_name}</p>

              <div className="pt-2">
                <span className="text-4xl font-black text-[#d4af37]">
                  {Number.isFinite(priceToShow) ? `$${priceToShow.toFixed(2)}` : "Price on Contact"}
                </span>
                {isDecant && listing.min_price != null && (
                  <span className="ml-3 text-sm text-gray-500">
                    {listing.min_price === listing.price ? "Fixed Decant Price" : "Starting Price"}
                  </span>
                )}
              </div>
              
              {isDecant && Array.isArray(listing.decant_options) && listing.decant_options.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <h3 className="text-base font-semibold text-gray-700 mb-2">Available Decant Sizes:</h3>
                  {/* DecantOptions component is assumed to handle the display of sizes/prices */}
                  <DecantOptions options={listing.decant_options} maxInline={4} />
                </div>
              )}
            </div>

            {/* Seller Card & Contact Options */}
            <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Meet the Seller</h3>
              
              <div className="flex items-center gap-4 border-b pb-4 mb-4">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.display_name ?? profile.username}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-[#d4af37]/50" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                    {profile.display_name?.charAt(0).toUpperCase() ?? profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold text-gray-900">{profile.display_name ?? profile.username}</div>
                  {profile.bio && <div className="text-sm text-gray-500 italic max-w-sm">{profile.bio}</div>}
                  <a href={`/perfumes/${profile.username}`} className="text-sm text-blue-600 hover:text-blue-800 transition duration-150">
                    View Other Listings &rarr;
                  </a>
                </div>
              </div>


              {/* Contact buttons: using modern icons and better spacing */}
              <div className="mt-4 flex flex-wrap gap-3">
                {profile.whatsapp_number && (
                  <a
                    href={`https://wa.me/${profile.whatsapp_number}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center bg-green-500 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-green-600 transition shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </a>
                )}
                {profile.messenger_link && (
                  <a href={profile.messenger_link} target="_blank" rel="noreferrer"
                    className="flex items-center bg-blue-500 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-600 transition shadow-md">
                    <MessageCircle className="w-4 h-4 mr-2" /> Messenger
                  </a>
                )}
                {profile.facebook_link && (
                  <a
                    href={profile.facebook_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-800 transition shadow-md"
                  >
                    <Facebook className="w-4 h-4 mr-2" /> Facebook
                  </a>
                )}
                {profile.contact_number && (
                  <a href={`tel:${profile.contact_number}`}
                    className="flex items-center bg-gray-800 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-900 transition shadow-md">
                    <Phone className="w-4 h-4 mr-2" /> Call
                  </a>
                )}
              </div>

              {/* Warning/Safety Notice */}
              {!hasAnyContact && (
                <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
                  <p className="font-bold">Caution:</p>
                  <p className="text-sm">This seller hasn’t added any verifiable contact details yet. Please be cautious and avoid making commitments without proper verification. We recommend using a platform that provides seller verification.</p>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}