"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useUiStore } from "@/stores/useUiStore";
import { RefreshCw, Heart, Sparkles, ShoppingBag } from "lucide-react";
import { useState } from "react";

async function fetchListings(brand: string, q: string) {
  let query = supabase
    .from("listings")
    .select(`
      id, brand, sub_brand, perfume_name, type, price, decants, images, created_at,
      seller:profiles!listings_user_id_fkey ( display_name, username )
    `)
    .order("created_at", { ascending: false });

  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (q) query = query.or(`perfume_name.ilike.%${q}%,brand.ilike.%${q}%,sub_brand.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("Supabase listings error", error);
    throw error;
  }
  return data ?? [];
}


export default function PerfumeList() {
  const { brand, q } = useUiStore((s) => s.filters);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["listings", { brand, q }],
    queryFn: () => fetchListings(brand, q),
    staleTime: 60_000,
  });

  const toggleFavorite = (id: string) => {
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#1a1a1a]">{data.length} Perfumes Listed</h3>
          <p className="mt-1 text-sm text-[#555]">
            Explore perfumes uploaded by our community sellers
          </p>
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

      {/* cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((l: any) => (
          <ListingCard
            key={l.id}
            listing={l}
            isFavorite={favorites.has(l.id)}
            onToggleFavorite={() => toggleFavorite(l.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  isFavorite,
  onToggleFavorite,
}: {
  listing: any;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const image = listing.images?.[0] ||
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80";

  // Price logic
  let priceDisplay = "—";
  if (listing.type === "intact" || listing.type === "partial") {
    priceDisplay = `$${Number(listing.price).toFixed(2)}`;
  } else if (listing.type === "decant" && Array.isArray(listing.decants)) {
    const min = Math.min(...listing.decants.map((d: any) => Number(d.price)));
    const max = Math.max(...listing.decants.map((d: any) => Number(d.price)));
    priceDisplay = `$${min.toFixed(2)}–$${max.toFixed(2)}`;
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/5 bg-[#fffdf7] shadow-sm transition hover:-translate-y-[2px] hover:shadow-lg">
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
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-50 to-rose-50">
        {!imgErr ? (
          <img
            src={image}
            alt={`${listing.brand} ${listing.perfume_name}`}
            onLoad={() => setLoaded(true)}
            onError={() => setImgErr(true)}
            className={`h-full w-full object-cover transition-opacity ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-10 w-10 text-amber-300" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* content */}
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-[#c08a00]">
            {listing.brand}
          </span>
          <span className="inline-block rounded-full bg-[#f5f1e8] px-2 py-1 text-xs capitalize text-[#333]">
            {listing.type}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-1 font-semibold text-[#111]">{listing.perfume_name}</h3>
        {listing.sub_brand && (
          <p className="text-xs text-[#666] mb-2">{listing.sub_brand}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-semibold text-[#111]">{priceDisplay}</span>
          <button className="group/btn flex items-center gap-1 rounded-full bg-[#1a1a1a] px-3 py-2 text-sm font-medium text-[#f9f6ef] transition hover:opacity-90">
            <ShoppingBag className="h-3 w-3 transition group-hover/btn:scale-110" />
            <span>Add</span>
          </button>
        </div>

        <p className="mt-3 text-xs text-[#666]">
          Seller:{" "}
          <span className="font-medium text-[#1a1a1a]">
            {listing.profiles?.display_name || listing.profiles?.username || "Anonymous"}
          </span>
        </p>
      </div>
    </div>
  );
}

/* Skeletons / errors / empty remain same except titles */
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
      <h3 className="mb-2 text-lg font-semibold text-[#111]">Unable to load listings</h3>
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
      <h3 className="mb-3 text-xl font-semibold text-[#111]">No listings found</h3>
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
