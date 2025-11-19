"use client";

// app/page.tsx
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import TrendingGrid from "./TrendingGrid";
import TrendingBrands from "./TrendingBrands";

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

type TabType = "now" | "week" | "month" | "brands";

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

async function fetchTrendingWeek() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte("last_clicked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("click_score", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}



async function fetchTrendingMonth() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte("last_clicked_at", startOfMonth.toISOString())
    .order("click_score", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}



async function fetchTrendingBrands() {
  const { data, error } = await supabase
    .rpc("get_trending_brands");

  if (error) throw error;
  return data;
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
    const [tab, setTab] = useState<TabType>("now");
    const { data: perfumes = [], isLoading, error 
        } = useQuery({queryKey: ['trendingPerfumes'],
        queryFn: fetchTrendingPerfumes,
        staleTime: 60_000,
    })

    const { data: week = [] } = useQuery({
        queryKey: ["trending-week"],
        queryFn: fetchTrendingWeek
    });

    const { data: month = [] } = useQuery({
        queryKey: ["trending-month"],
        queryFn: fetchTrendingMonth
    });

    // NEW: Brand Trending
    const { data: brands = [] } = useQuery({
        queryKey: ["trendingBrands"],
        queryFn: fetchTrendingBrands,
        staleTime: 60_000,
    });

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
                {/* Tabs */}
                <div className="mt-10 flex gap-4 border-b border-black/10">
                {[
                    { key: "now", label: "Trending Now" },
                    { key: "week", label: "This Week" },
                    { key: "month", label: "This Month" },
                    { key: "brands", label: "Top Brands" }
                ].map(t => (
                    <button
                    key={t.key}
                    onClick={() => setTab(t.key as TabType)}
                    className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 ${
                        tab === t.key
                        ? "border-[#d4af37] text-[#111]"
                        : "border-transparent text-[#666] hover:text-[#111]"
                    }`}
                    >
                    {t.label}
                    </button>
                ))}
                </div>

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
            
            {tab === "now" && <TrendingGrid perfumes={perfumes} />}
            {tab === "week" && <TrendingGrid perfumes={week} />}
            {tab === "month" && <TrendingGrid perfumes={month} />}
            {tab === "brands" && <TrendingBrands brands={brands} />}
    </div>
</section>
)
}

