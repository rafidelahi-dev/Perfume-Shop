"use client";

// components/TrendingSection.tsx
import { useState } from "react";
import Link from "next/link";
import "../app/globals.css";
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

// --- DATA FETCHING (PRESERVED) ---
async function fetchTrendingPerfumes(): Promise<PerfumeScoreRow[]>{
  const { data, error} = await supabase
  .from("perfume_score")
  .select("id, brand, perfume_name, sub_brand, min_price, representative_images, click_score, last_clicked_at")
  .order("click_score", {ascending: false})
  .order("last_clicked_at", {ascending: false})
  .limit(5);

  if(error) throw error;
  return data ?? []
}

async function fetchTrendingWeek() {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("*")
    .gte("last_clicked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("click_score", { ascending: false })
    .limit(5);

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
    .rpc("get_trending_brands")
    .limit(9);

  if (error) throw error;
  return data;
}

export default function TrendingSection() {
    const [tab, setTab] = useState<TabType>("now");
    const { data: perfumes = [], isLoading, error } = useQuery({
        queryKey: ['trendingPerfumes'],
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

    const { data: brands = [] } = useQuery({
        queryKey: ["trendingBrands"],
        queryFn: fetchTrendingBrands,
        staleTime: 60_000,
    });

    return (
        <section className="py-20 px-6 sm:px-12 bg-[#fcfbf9]">
            <div className="mx-auto max-w-7xl">
                
                {/* Header & Tabs Container */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-serif text-[#111] mb-3">
                            Trending Collections
                        </h2>
                        <p className="text-[#666] font-light max-w-md">
                            Discover the scents captivating our community this season.
                        </p>
                    </div>

                    {/* Modern Pill Tabs */}
                    <div className="flex bg-gray-100/80 p-1.5 rounded-full overflow-x-auto tab-scroll max-w-full">
                        {[
                            { key: "now", label: "Today" },
                            { key: "week", label: "This Week" },
                            { key: "month", label: "This Month" },
                            { key: "brands", label: "Brands" },
                        ].map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key as TabType)}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                                    tab === t.key
                                    ? "bg-white text-[#1a1a1a] shadow-sm"
                                    : "text-gray-500 hover:text-[#1a1a1a]"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-96 rounded-2xl bg-gray-100 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="w-full h-40 flex items-center justify-center border border-red-100 bg-red-50 rounded-lg">
                            <p className="text-red-600">Failed to load trending data.</p>
                        </div>
                    )}

                    {!isLoading && !error && perfumes.length === 0 && (
                        <p className="text-center text-gray-500 py-20">
                            No trending data yet. Be the first to explore!
                        </p>
                    )}
                    
                    {!isLoading && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {tab === "now" && <TrendingGrid perfumes={perfumes} />}
                            {tab === "week" && <TrendingGrid perfumes={week} />}
                            {tab === "month" && <TrendingGrid perfumes={month} />}
                            {tab === "brands" && <TrendingBrands brands={brands} />}
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href="/perfumes"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1a] hover:text-[#d4af37] transition-colors border-b border-[#1a1a1a] hover:border-[#d4af37] pb-0.5"
                    >
                        View Full Collection <span>→</span>
                    </Link>
                </div>
            </div>
        </section>
    )
}