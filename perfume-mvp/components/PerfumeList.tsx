"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useUiStore } from "@/stores/useUiStore";
import { RefreshCw, Sparkles, Star, Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";

async function fetchPerfumes(brand: string, q: string) {
  let query = supabase.from("perfumes").select("*").order("brand");
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (q) query = query.or(`name.ilike.%${q}%,notes.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export default function PerfumeList() {
  const { brand, q } = useUiStore((s) => s.filters);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["perfumes", { brand, q }],
    queryFn: () => fetchPerfumes(brand, q),
    staleTime: 60_000,
  });

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return <PerfumeListLoading />;
  if (error) return <PerfumeListError onRetry={refetch} />;
  if (!data?.length) return <PerfumeListEmpty />;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#1a1a1a]">{data.length} Fragrances Found</h3>
          <p className="mt-1 text-sm text-[#555]">Discover your perfect scent from our curated collection</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 rounded-full border border-black/10 bg-[#fffdf7] px-4 py-2 text-[#1a1a1a] transition hover:bg-[#f2eee4] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          {isRefetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((p: any) => (
          <PerfumeCard
            key={p.id}
            perfume={p}
            isFavorite={favorites.has(p.id)}
            onToggleFavorite={() => toggleFavorite(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PerfumeCard({
  perfume,
  isFavorite,
  onToggleFavorite,
}: {
  perfume: any;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const placeholder =
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/5 bg-[#fffdf7] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]">
      {/* favorite */}
      <button
        onClick={onToggleFavorite}
        className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur hover:bg-white"
      >
        <Heart
          className={`h-4 w-4 transition ${
            isFavorite ? "scale-110 fill-rose-500 text-rose-500" : "text-black/40 hover:text-rose-500"
          }`}
        />
      </button>

      {/* image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-amber-50 to-rose-50">
        {!imgErr ? (
          <img
            src={perfume.image_url || placeholder}
            alt={`${perfume.brand} ${perfume.name}`}
            onLoad={() => setLoaded(true)}
            onError={() => setImgErr(true)}
            className={`h-full w-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-10 w-10 text-amber-300" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* content */}
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[#c08a00]">{perfume.brand}</span>
          {perfume.rating && (
            <span className="flex items-center gap-1 text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs font-medium">{perfume.rating}</span>
            </span>
          )}
        </div>

        <h3 className="mb-2 line-clamp-1 font-semibold text-[#111]">{perfume.name}</h3>

        {perfume.notes && (
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-[#555]">{perfume.notes}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          {perfume.price ? (
            <span className="text-lg font-semibold text-[#111]">${parseFloat(perfume.price).toFixed(2)}</span>
          ) : (
            <span className="text-sm text-[#666]">Price on request</span>
          )}

          <button className="group/btn rounded-full bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-[#f9f6ef] transition hover:opacity-90">
            <ShoppingBag className="h-3 w-3 transition group-hover/btn:scale-110" />
            <span className="ml-1">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* Loading / Error / Empty unchanged except palette tweaks */

function PerfumeListLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-44 rounded bg-black/10" />
        <div className="h-9 w-28 rounded-full bg-black/10" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-black/5 bg-[#fffdf7]">
            <div className="h-40 animate-pulse bg-black/10" />
            <div className="space-y-3 p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-black/10" />
              <div className="h-4 w-32 animate-pulse rounded bg-black/10" />
              <div className="h-3 w-full animate-pulse rounded bg-black/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerfumeListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <Sparkles className="h-8 w-8 text-amber-700" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#111]">Unable to load fragrances</h3>
      <p className="mx-auto mb-6 max-w-md text-[#555]">Please try again.</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-[#f9f6ef] hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

function PerfumeListEmpty() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <Sparkles className="h-10 w-10 text-amber-700" />
      </div>
      <h3 className="mb-3 text-xl font-semibold text-[#111]">No fragrances found</h3>
      <p className="mx-auto mb-6 max-w-md text-[#555]">
        Try different filters or search terms.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-[#f9f6ef] hover:opacity-90"
      >
        Clear filters
      </button>
    </div>
  );
}
