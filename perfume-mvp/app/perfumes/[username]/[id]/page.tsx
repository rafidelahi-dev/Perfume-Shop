// server component
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Phone, MessageCircle, Facebook, Zap, BadgeCheck, CalendarDays, Package } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DecantOptions from "../../components/DecantOptions";
import ImageGallery from "./ImageGallery";
import ListingActions from "./ListingActions";
import { listingUrl, pricePerMl, timeAgo, typeLabel } from "@/lib/listingUtils";

export const revalidate = 60;

function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Props = { params: Promise<{ username: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, id } = await params;
  const supabase = createPublicSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .single();

  if (!profile) {
    return { title: "Listing Not Found | CloudPerfumeBD" };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("brand, perfume_name, type, price, min_price, decant_options, images")
    .eq("id", id)
    .eq("user_id", profile.id)
    .eq("is_hidden", false)
    .single();

  if (!listing) {
    return { title: "Listing Not Found | CloudPerfumeBD" };
  }

  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceNum = isDecant && listing.min_price != null
    ? Number(listing.min_price)
    : Number(listing.price ?? NaN);
  const priceText = Number.isFinite(priceNum) ? `TK${priceNum.toFixed(0)}` : "price on contact";
  const displayName = profile.display_name ?? profile.username;

  type DecantOption = { ml: number; price: number };
  const decantOptions = Array.isArray(listing.decant_options)
    ? (listing.decant_options as DecantOption[]).sort((a, b) => a.ml - b.ml)
    : [];
  const sizeStr = isDecant && decantOptions.length > 0
    ? decantOptions.map((o) => `${o.ml}ml`).join("/")
    : null;
  const typeLabel = isDecant
    ? `Decant${sizeStr ? ` ${sizeStr}` : ""}`
    : (listing.type ?? "").charAt(0).toUpperCase() + (listing.type ?? "").slice(1);

  const title = `${listing.brand} ${listing.perfume_name} in Bangladesh — ${typeLabel}`;
  const description = `Buy ${listing.brand} ${listing.perfume_name} ${typeLabel.toLowerCase()} in Bangladesh from ${displayName}. Starting ${priceText}. Authentic fragrance.`.slice(0, 150);
  const image = Array.isArray(listing.images) && listing.images[0]
    ? (listing.images as string[])[0]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://www.cloudperfumebd.com/perfumes/${username}/${id}` },
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: listing.perfume_name }] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { username, id } = await params;
  const supabase = createPublicSupabase();

  // 2. Find seller by username
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, contact_number, whatsapp_number, messenger_link, facebook_link, bio, phone_verified, created_at")
    .eq("username", username)
    .single();
  if (pErr || !profile) redirect("/perfumes");

  // 3. Fetch the listing (and ensure it belongs to that profile)
  const { data: listing, error: lErr } = await supabase
    .from("listings")
    .select(`
      id, brand, perfume_name, sub_brand,
      type, price, min_price, decant_options,
      bottle_size_ml, partial_left_ml,
      images, created_at, status
    `)
    .eq("id", id)
    .eq("user_id", profile.id)
    .eq("is_hidden", false)
    .single();
  if (lErr || !listing) notFound();

  const { count: sellerPostCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_hidden", false);

  // Fetch community reviews for this perfume (public, no auth needed)
  const { data: perfumeReviews } = await supabase
    .from("reviews")
    .select("rating, review_text, created_at")
    .eq("brand", listing.brand ?? "")
    .eq("perfume_name", listing.perfume_name ?? "")
    .not("rating", "is", null)
    .limit(20);

  const ratingMap: Record<string, number> = {
    love: 5,
    like: 4,
    okay: 3,
    dislike: 2,
    hate: 1,
  };

  const numericRatings = (perfumeReviews ?? [])
    .map((r) => ratingMap[r.rating ?? ""])
    .filter((n): n is number => n !== undefined);

  const avgRating =
    numericRatings.length > 0
      ? numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length
      : null;

  // --- Calculated Properties ---

  const hasAnyContact =
    !!profile.whatsapp_number ||
    !!profile.messenger_link ||
    !!profile.facebook_link ||
    !!profile.contact_number;

  const isSold = listing.status === "sold";
  const ppm = pricePerMl(listing);
  const posted = timeAgo(listing.created_at);
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const pageUrl = listingUrl(username, id);
  const shareText = `${listing.brand ?? ""} ${listing.perfume_name ?? ""} (${typeLabel(listing.type)}) on Cloud PerfumeBD`.trim();

  const isDecant = (listing.type ?? "").toLowerCase() === "decant";
  const priceToShow =
    isDecant && listing.min_price != null ? Number(listing.min_price) : Number(listing.price ?? NaN);

  // --- Component Rendering ---

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.perfume_name,
    brand: { "@type": "Brand", name: listing.brand },
    ...(listing.sub_brand ? { description: listing.sub_brand } : {}),
    image: Array.isArray(listing.images) && listing.images.length > 0
      ? (listing.images as string[])
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: Number.isFinite(priceToShow) ? priceToShow.toFixed(2) : undefined,
      availability: isSold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: `https://www.cloudperfumebd.com/perfumes/${username}/${id}`,
      seller: {
        "@type": "Person",
        name: profile.display_name ?? profile.username,
        url: `https://www.cloudperfumebd.com/perfumes/${username}`,
      },
    },
    ...(avgRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: numericRatings.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: (perfumeReviews ?? [])
            .filter((r) => r.review_text)
            .slice(0, 3)
            .map((r) => ({
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: ratingMap[r.rating ?? ""] ?? 3,
                bestRating: 5,
                worstRating: 1,
              },
              reviewBody: r.review_text,
              datePublished: r.created_at?.split("T")[0],
            })),
        }
      : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Perfumes", item: "https://www.cloudperfumebd.com/perfumes" },
      { "@type": "ListItem", position: 2, name: profile.display_name ?? profile.username, item: `https://www.cloudperfumebd.com/perfumes/${username}` },
      { "@type": "ListItem", position: 3, name: `${listing.brand} — ${listing.perfume_name}`, item: `https://www.cloudperfumebd.com/perfumes/${username}/${id}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-24">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* 1. Images Section (Left Column) */}
          <div className="lg:sticky lg:top-24">
            {(listing.images ?? []).length > 0 ? (
              <ImageGallery
                images={listing.images as string[]}
                perfumeName={listing.perfume_name ?? "Perfume"}
              />
            ) : (
              <div className="h-[400px] w-full rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 shadow-lg border border-gray-300">
                <Zap className="w-8 h-8 mr-2" /> No Images Available
              </div>
            )}
          </div>

          {/* 2. Content & Seller Section (Right Column) */}
          <div className="space-y-6">
            
            {isSold && (
              <div role="status" className="rounded-xl border border-gray-300 bg-gray-900 px-5 py-4 text-white">
                <p className="font-semibold">This one is sold.</p>
                <p className="mt-0.5 text-sm text-white/70">
                  <Link href={`/perfumes/${profile.username}`} className="underline hover:text-[#d4af37]">
                    See what else this seller has
                  </Link>{" "}
                  or{" "}
                  <Link href="/perfumes" className="underline hover:text-[#d4af37]">
                    browse all sell posts
                  </Link>
                  .
                </p>
              </div>
            )}

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
              
              <p className="text-xl text-gray-700 font-light">{listing.perfume_name}</p>
              <p className="border-b pb-4 text-sm text-gray-500">
                {typeLabel(listing.type)}
                {listing.type === "partial" && listing.partial_left_ml ? ` · ${listing.partial_left_ml} ml left` : ""}
                {listing.type === "intact" && listing.bottle_size_ml ? ` · ${listing.bottle_size_ml} ml` : ""}
                {posted ? ` · Posted ${posted}` : ""}
              </p>

              <div className="pt-2">
                <span className="text-4xl font-black text-[#d4af37]">
                  {Number.isFinite(priceToShow) ? `TK${priceToShow.toFixed(2)}` : "Price on Contact"}
                </span>
                {isDecant && listing.min_price != null && (
                  <span className="ml-3 text-sm text-gray-500">
                    {listing.min_price === listing.price ? "Fixed Decant Price" : "Starting Price"}
                  </span>
                )}
                {ppm != null && (
                  <p className="mt-1 text-sm text-[#8a6d00]">
                    {isDecant ? "As low as" : "About"} ৳{ppm.toFixed(0)} per ml
                  </p>
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
                  <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
                    {profile.display_name ?? profile.username}
                    {profile.phone_verified && (
                      <BadgeCheck className="h-5 w-5 text-[#8a6d00]" aria-label="Phone verified" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {profile.phone_verified && <span className="font-medium text-[#8a6d00]">Phone verified</span>}
                    {typeof sellerPostCount === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" aria-hidden="true" /> {sellerPostCount} sell post{sellerPostCount === 1 ? "" : "s"}
                      </span>
                    )}
                    {memberSince && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Member since {memberSince}
                      </span>
                    )}
                  </div>
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

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <ListingActions
                listingId={listing.id}
                sellerId={profile.id}
                url={pageUrl}
                shareText={shareText}
                returnTo={`/perfumes/${username}/${id}`}
              />
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}