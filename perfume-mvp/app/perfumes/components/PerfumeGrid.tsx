"use client";

import Image from "next/image";

type SellerProfile = {
    display_name: string | null;
    avatar_url?: string | null;
}

type PerfumeListing = {
    id: string;
    brand: string | null;
    sub_brand?: string | null;
    perfume_name: string | null;
    price: number | null;
    bottle_type?: string | null;
    decant_ml?: number | null;
    images?: string[] | null;
    profiles?: SellerProfile | null;
}

type PerfumeGridProps = { 
    perfumes: PerfumeListing[];
    isLoading: boolean;
    error: any;
}

export default function PerfumeGrid({ perfumes, isLoading, error }: PerfumeGridProps) {
  if (error)
    return (
      <p className="text-center text-red-600">
        Failed to load perfumes: {error.message}
      </p>
    );

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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {perfumes.map((p) => {
        const thumb = Array.isArray(p.images) ? p.images[0] : null;
        return (
          <div
            key={p.id}
            className="group rounded-2xl border border-black/5 bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
          >
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

            <div className="p-4">
              <p className="font-small text-[#666] truncate">
                {p.brand} {p.sub_brand && `– ${p.sub_brand}`}
              </p>
              <b className="text-md text-[#1a1a1a] truncate">{p.perfume_name}</b>
              <p className="mt-2 text-[#d4af37] font-semibold">
                ${Number(p.price).toFixed(2)}
              </p>
              {p.profiles && (
                <p className="text-xs text-[#555] mt-1">
                  Sold by{" "}
                  <span className="font-medium">{p.profiles.display_name}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
