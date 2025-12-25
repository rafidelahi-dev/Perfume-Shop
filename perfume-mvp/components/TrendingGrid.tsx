"use client";

import Image from "next/image";
import Link from "next/link";

type PerfumeScoreRow = {
  id: string;
  brand: string | null;
  perfume_name: string;
  sub_brand?: string | null;
  min_price: number | null;
  representative_images: string[] | null;
  click_score: number | null;
};

export default function TrendingGrid({ perfumes }: { perfumes: PerfumeScoreRow[] }) {
  if (!perfumes || perfumes.length === 0)
    return (
      <p className="text-center text-gray-600 mt-6">
        No perfumes found for this filter.
      </p>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 mt-8">
      {perfumes.map((p) => {
        const img =
          Array.isArray(p.representative_images) && p.representative_images.length > 0
            ? p.representative_images[0]
            : null;

        const displayPrice =
          typeof p.min_price === "number" ? p.min_price.toFixed(2) : null;

        return (
          <Link
            key={p.id}
            href={`/perfumes?q=${encodeURIComponent(p.perfume_name)}&brand=${encodeURIComponent(p.brand ?? "")}`}
            className="group flex flex-col gap-4"
          >
            {/* Image Container */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#f0f0f0] shadow-sm transition-all duration-500 group-hover:shadow-xl">
              {img ? (
                <Image
                  src={img}
                  alt={p.perfume_name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
                  <span className="text-4xl">?</span>
                </div>
              )}
              
              {/* Overlay Tags */}
              <div className="absolute top-3 left-3 flex gap-2">
                 {p.brand && (
                    <span className="backdrop-blur-md bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] rounded-sm">
                        {p.brand}
                    </span>
                 )}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h3 className="font-serif text-lg text-[#1a1a1a] line-clamp-1 group-hover:text-[#d4af37] transition-colors">
                {p.perfume_name}
              </h3>
              
              <div className="flex items-center justify-between text-sm">
                 <p className="text-gray-500 font-light">
                   {p.sub_brand ? p.sub_brand : "Original Collection"}
                 </p>
                 {displayPrice && (
                   <span className="font-medium text-[#1a1a1a]">
                     TK{displayPrice}<span className="text-xs text-gray-400 font-normal">+</span>
                   </span>
                 )}
              </div>
              
              {/* {p.click_score !== null && (
                 <div className="flex items-center gap-1 pt-2">
                    <div className="h-1 flex-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-[#d4af37]/50" style={{ width: `${Math.min(p.click_score, 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-gray-400">{p.click_score} views</span>
                 </div>
              )} */}
              
            </div>
          </Link>
        );
      })}
    </div>
  );
}