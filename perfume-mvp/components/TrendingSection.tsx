"use client";

// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

type PerfumeScoreRow = {
  id: string;
  brand: string | null;
  perfume_name: string;
  sub_brand?: string | null;
  min_price: number | null;
  representative_images: string[] | null;
  click_score: number | null;
  last_clicked_at: string | null;
}

async function fetchTrendingPerfumes(): Promise<PerfumeScoreRow[]>{
  const { data, error} = await supabase
  .from("perfume_score")
  .select("id, brand, perfume_name, sub_brand, min_price, representative_images, click_score, last_clicked_at")
  .order("click_score", {ascending: false})
  .order("last_clicked_at", {ascending: false})
  .limit(8);

  if(error) throw error;
  return data ?? []
}

const gradientClasses = [
  "bg-gradient-to-br from-blue-50 to-blue-100",
  "bg-gradient-to-br from-amber-50 to-amber-100",
  "bg-gradient-to-br from-gray-50 to-gray-100",
  "bg-gradient-to-br from-rose-50 to-rose-100",
  "bg-gradient-to-br from-emerald-50 to-emerald-100",
  "bg-gradient-to-br from-indigo-50 to-indigo-100",
];

export default function TrendingSection() {
    const { data: perfumes = [], isLoading, error 
        } = useQuery({queryKey: ['trendingPerfumes'],
        queryFn: fetchTrendingPerfumes,
        staleTime: 60_000,
    })
    return (
        <section className="py-20 px-6 sm:px-12 bg-gradient-to-b from-white/50 to-[#f8f7f3]">
            <div className="mx-auto max-w-[110rem] px-4">
                {/* Header */}
                <div className="flex items-end justify-between mb-16">
                <div>
                    <h2 className="text-3xl font-light text-[#111] mb-4">
                    Trending Now
                    </h2>
                    <p className="text-[#666] font-light">
                    Discover what the community is loving this season
                    </p>
                </div>
                <Link
                    href="/perfumes"
                    className="text-sm text-[#666] hover:text-[#111] border-b border-transparent hover:border-[#111] transition-all pb-1"
                >
                    View all collections
                </Link>
                </div>

                {/* Loading state */}
                {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-80 rounded-3xl bg-gray-100 animate-pulse"
                    />
                    ))}
                </div>
                )}

                {error && !isLoading && (
                    <p className="text-center text-red-600">
                        Failed to load trending perfumes.
                    </p>
                )}

                {!isLoading && !error && perfumes.length === 0 && (
                    <p className="text-center text-gray-600">
                        No trending perfumes found. Start exploring perfumes to build trends. 
                    </p>
                )}
                
                {!isLoading && !error && perfumes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {perfumes.map((p, index) => {
                            const gradient = gradientClasses[index % gradientClasses.length];
                            const img = Array.isArray(p.representative_images) && p.representative_images.length > 0
                                ? p.representative_images[0]
                                : null;
                            const displayPrice = typeof p.min_price === "number"
                                ? p.min_price.toFixed(2)
                                : null;
                            const brandLine = p.sub_brand
                                ? `${p.brand} - ${p.sub_brand}`
                                : p.brand;

                            return (
                <div
                  key={p.id}
                  className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                >
                  {/* Image area */}
                  <div
                    className={`relative h-64 ${gradient} flex items-center justify-center`}
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt={p.perfume_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      // Mock bottle illustration if no image
                      <div className="w-16 h-32 bg-gradient-to-b from-white to-gray-200 rounded-lg shadow-lg border border-white/50 relative">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full" />
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-24 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm" />
                      </div>
                    )}

                    {/* Fake favourite button (UI only for now) */}
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110">
                      <span className="text-lg">♥</span>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-lg text-[#111] truncate">
                          {p.perfume_name}
                        </h3>
                        <p className="text-sm text-[#666] font-light truncate">
                          {brandLine}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white whitespace-nowrap">
                        {displayPrice ? `$${displayPrice}` : "From —"}
                      </span>
                    </div>

                    <p className="text-xs text-[#666] mb-4 font-light">
                      {displayPrice
                        ? "Starting from community listings"
                        : "Price varies across listings"}
                    </p>

                    {/* Small meta chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs text-[#666] border border-white/30">
                        {p.brand}
                      </span>
                      {p.click_score !== null && (
                        <span className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs text-[#666] border border-white/30">
                          {p.click_score} views
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {/* For now, just link to /perfumes; later you could add query params to filter */}
                      <Link
                        href="/perfumes"
                        className="flex-1 rounded-xl border border-[#1a1a1a] px-4 py-3 text-sm font-medium text-center hover:bg-[#eae8e1] transition-all"
                      >
                        Details
                      </Link>
                      <Link
                        href="/perfumes"
                        className="flex-1 rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-center text-white hover:opacity-90 transition-all"
                      >
                        Explore Listings
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
    )
    }
    
