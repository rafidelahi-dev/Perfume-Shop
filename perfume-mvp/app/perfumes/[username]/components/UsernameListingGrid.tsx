// app/perfumes/[username]/UsernameListingGrid.tsx
"use client";
import Link from "next/link";
import Image from "next/image";

type SellerListing = {
  id: string;
  brand: string;
  perfume_name: string;
  sub_brand: string | null;
  price: number;
  type: string;
  min_price: number | null;
  images: string[] | null;
  profiles?: {
    username: string;
    display_name: string | null;
  };
};

// Simplified effective price calculation for the Seller's grid
function effectivePrice(l: SellerListing) {
    if ((l.type ?? "").toLowerCase() === "decant" && l.min_price != null) {
        return Number(l.min_price);
    }
    return Number(l.price ?? NaN);
}


export function UsernameListingGrid({
  listings,
  emptyText,
}: {
  listings: SellerListing[];
  emptyText?: string;
}) {
  if (!listings || listings.length === 0) {
    return (
      <p className="text-center text-gray-500 mt-8 italic font-light">
        {emptyText ?? "No listings found."}
      </p>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {listings.map((l) => {
        const thumb = Array.isArray(l.images) ? l.images[0] : null;
        const priceToShow = effectivePrice(l);
        const linkHref = `/perfumes/${l?.profiles?.username}/${l.id}`;

        return (
        <Link
          key={l.id}
          href={linkHref}
          prefetch={false}
          // Premium Card Styling
          className="group block rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#d4af37]/30"
        >
            {/* Image Area */}
            <div className="aspect-[3/4] relative bg-[#f9f6ef] overflow-hidden">
                {thumb ? (
                    <Image
                        src={thumb}
                        alt={l.perfume_name || "Perfume"}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#f2eee4] text-[#aaa] text-sm">
                        No Image
                    </div>
                )}
            </div>

          {/* Text info */}
          <div className="p-4 flex flex-col justify-between h-auto">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider font-medium text-gray-500 truncate mb-1">
                {l.brand} {l.sub_brand && <span className="text-[#d4af37]"> • </span>} {l.sub_brand}
              </p>
              <h3 className="text-lg font-serif font-semibold text-[#1a1a1a] truncate group-hover:text-[#d4af37] transition">
                {l.perfume_name}
              </h3>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs uppercase font-medium text-gray-500 mb-1">{l.type}</div>
              <p className="text-[#1a1a1a] font-bold text-lg">
                {Number.isFinite(priceToShow)
                  ? `TK${priceToShow.toFixed(2)}`
                  : "—"}
                <span className="text-xs font-light text-gray-500 ml-1">USD</span>
              </p>
            </div>
          </div>
        </Link>
        );
      })}
    </div>
  );
}