"use client";

import Image from "next/image";
import Link from "next/link";
import DecantOptions from "./DecantOptions";

type SellerProfile = {
  display_name: string | null;
  avatar_url?: string | null;
  username: string | null;
};

export type PerfumeListing = {
  id: string;
  brand: string | null;
  perfume_name: string | null;
  sub_brand?: string | null;
  price: number | null;
  min_price?: number | null;
  type?: string | null;
  bottle_type?: string | null;
  decant_ml?: number | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: unknown;
  images?: string[] | null;
  profiles?: SellerProfile | null;
};

type PerfumeGridProps = {
  perfumes: PerfumeListing[];
  isLoading: boolean;
  error: unknown | null;
};

// ✅ Use min_price for decants; otherwise normal price
function effectivePrice(p: PerfumeListing) {
  if ((p.type ?? "").toLowerCase() === "decant" && p.min_price != null) {
    return Number(p.min_price);
  }
  return Number(p.price ?? NaN);
}

// ✅ Badge text under price
function typeBadge(p: PerfumeListing) {
  const t = (p.type ?? "").toLowerCase();
  if (t === "decant")
    return p.decant_ml ? `Decant • ${p.decant_ml} ml` : "Decant";
  if (t === "partial")
    return p.partial_left_ml
      ? `Partial • ${p.partial_left_ml} ml left`
      : "Partial";
  if (t === "intact") return "Intact";
  return null;
}


// Component
// -----------------------------
export default function PerfumeGrid({
  perfumes,
  isLoading,
  error,
}: PerfumeGridProps) {
  if (error)
  { const message = error instanceof Error ? error.message : "Failed to load perfumes";
    return (
      <p className="text-center text-red-600">
        Failed to load perfumes: {message}
      </p>
    );}

  if (isLoading)
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100"
          ></div>
        ))}
      </div>
    );

  if (!perfumes.length)
    return (
      <p className="text-center text-gray-600 mt-12">
        No perfumes found matching your filters.
      </p>
    );

  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {perfumes.map((p) => {
        const thumb = Array.isArray(p.images) ? p.images[0] : null;
        const priceToShow = effectivePrice(p);
        const badge = typeBadge(p);

        return (
          <li key={p.id}>
            <Link
              href={`/perfumes/${p?.profiles?.username}/${p.id}`}
              prefetch={false}
              className="block group rounded-2xl border border-black/5 bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
            >
              {/* ---------------- Image ---------------- */}
              <div className="aspect-[3/4] relative">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={p.perfume_name || "Perfume"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#f9f6ef] text-[#aaa] text-sm">
                    No Image
                  </div>
                )}
              </div>

              {/* ---------------- Content ---------------- */}
              <div className="p-4">
                <p className="font-small text-[#666] truncate">
                  {p.brand} {p.sub_brand && `– ${p.sub_brand}`}
                </p>

                <b className="text-md text-[#1a1a1a] truncate">
                  {p.perfume_name}
                </b>

                {/* Price & Type */}
                <div className="mt-2">
                  <p className="text-[#d4af37] font-semibold">
                    {Number.isFinite(priceToShow)
                      ? `$${priceToShow.toFixed(2)}`
                      : "—"}
                  </p>
                  {badge && (
                    <span className="mt-1 inline-block text-[11px] rounded-full bg-[#fff6dc] border border-[#d4af37]/40 px-2 py-0.5 text-[#6b5600]">
                      {badge}
                    </span>
                  )}
                  {(p.type ?? "").toLowerCase() === "decant" &&
                    Array.isArray(p.decant_options) &&
                    p.decant_options.length > 0 && (
                      <DecantOptions
                        options={p.decant_options}
                        maxInline={3}
                      />
                    )}
                </div>

                {/* Seller Info */}
                {p.profiles && (
                  <p className="text-xs text-[#555] mt-1">
                    Sold by{" "}
                    <span className="font-medium">
                      {p.profiles.display_name ?? p.profiles.username}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
