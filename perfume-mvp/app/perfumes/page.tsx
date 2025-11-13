"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import PerfumeGrid from "./components/PerfumeGrid";
import { useUiStore } from "@/stores/useUiStore";
import { Sparkles, Filter, X, Search } from "lucide-react";

type SellerProfile = {
  display_name: string | null;
  avatar_url?: string | null;
  username: string | null;
};

export type PerfumeListing = {
  id: string;
  brand: string | null;
  perfume_name: string | null; // <-- matches your table
  sub_brand?: string | null;
  price: number | null;        // price/min_price are numeric in DB
  min_price?: number | null;
  type?: string | null;        // intact/full/partial/decant
  bottle_type?: string | null;
  decant_ml?: number | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: unknown;    // jsonb if you use it
  images?: string[] | null;    // text[]
  profiles?: SellerProfile | null;
};

type RawListing = Omit<PerfumeListing, "profiles"> & {
  profiles?: SellerProfile[] | SellerProfile | null;
};

async function fetchPerfumes(): Promise<PerfumeListing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      brand,
      perfume_name,
      sub_brand,
      price,
      min_price,
      type,
      bottle_size_ml,
      partial_left_ml,
      decant_options,
      images,
      profiles:profiles!listings_user_id_fkey ( display_name, avatar_url, username, contact_link, messenger_link, whatsapp_number  )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data as RawListing[]) ?? [];

  // Normalize profiles (array -> single object)
  return rows.map((l) => ({
    ...l,
    profiles: Array.isArray(l.profiles) ? l.profiles[0] ?? null : l.profiles ?? null,
  }));
}


export default function PerfumesPage() {
  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["perfumes"],
    queryFn: fetchPerfumes,
  });

  const isOpen = useUiStore((s) => s.isFilterOpen);
  const toggle = useUiStore((s) => s.toggleFilter);
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const reset = useUiStore((s) => s.resetFilters);


  function effectivePrice(p: PerfumeListing) {
  if ((p.type ?? "").toLowerCase() === "decant" && p.min_price != null) {
    return Number(p.min_price);
  }
  return Number(p.price ?? NaN);
}



  // --- Derived filtered data ---
  const filteredPerfumes = useMemo(() => {
  const min = filters.priceMin ?? -Infinity;
  const max = filters.priceMax ?? +Infinity;
  const typeSet = new Set((filters.types ?? []).map(t => t.toLowerCase()));

  return listings.filter((item) => {
    const brandMatch = filters.brand
      ? item.brand?.toLowerCase().includes(filters.brand.toLowerCase())
      : true;

    const searchTarget = `${item.perfume_name ?? ""} ${item.sub_brand ?? ""} ${item.brand ?? ""}`.toLowerCase();
    const searchMatch = filters.q ? searchTarget.includes(filters.q.toLowerCase()) : true;

    // type filter: if none selected => all pass; else must include
    const typeVal = (item.type ?? "").toLowerCase();
    const typeMatch = typeSet.size === 0 ? true : typeSet.has(typeVal);

    // price filter: use effective price (min_price for decants, otherwise price)
    const p = effectivePrice(item);
    const priceMatch = !Number.isNaN(p) && p >= min && p <= max;

    return brandMatch && searchMatch && typeMatch && priceMatch;
  });
}, [listings, filters.brand, filters.q, filters.priceMin, filters.priceMax, filters.types]);



  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative w-full bg-gradient-to-br from-[#f9f6ef] via-[#f5f1e8] to-[#efe9dc] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-8 w-8 text-[#d4af37]" />
          </div>
          <h1 className="text-center text-4xl md:text-5xl font-semibold tracking-tight text-[#111]">
            Discover your{" "}
            <span className="text-[#d4af37]">signature scent</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#444]">
            Explore fragrances listed by our community of perfume lovers.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl -mt-10 px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
          <input
            className="w-full rounded-2xl border border-black/10 bg-white/90 px-12 py-4 shadow-sm outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
            placeholder="Search perfumes by name, brand, or sub-brand..."
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="mb-1 text-3xl font-light text-[#1a1a1a]">
              Perfume Collection
            </h2>
            <p className="text-[#666]">
              Browse, compare, and discover new fragrances
            </p>
          </div>

          <button
            onClick={toggle}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
              isOpen
                ? "bg-[#1a1a1a] text-[#f9f6ef] shadow"
                : "border border-black/10 bg-[#fffdf7]/80 text-[#1a1a1a] hover:bg-[#f2eee4]"
            }`}
          >
            <Filter className="h-5 w-5" />
            {isOpen ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {isOpen && (
          <div className="mb-10 rounded-3xl border border-black/5 bg-[#fffdf7]/80 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-light text-[#1a1a1a]">
                Refine your search
              </h3>
              <button
                onClick={reset}
                className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a]"
              >
                <X className="h-4 w-4" />
                Reset all
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">
                  Brand
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-12 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                    placeholder="e.g., Dior, Chanel"
                    value={filters.brand}
                    onChange={(e) =>
                      setFilters({ brand: e.target.value })
                    }
                  />
                </div>
              </div>
              {/* Price Range */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">
                  Price Range (USD)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.priceMin ?? ""}
                    onChange={(e) =>
                      setFilters({
                        priceMin: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                  />
                  <span className="text-[#888]">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.priceMax ?? ""}
                    onChange={(e) =>
                      setFilters({
                        priceMax: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                  />
                </div>

                {/* Quick presets */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "Under $50", min: null, max: 50 },
                    { label: "$50–$100", min: 50, max: 100 },
                    { label: "$100–$200", min: 100, max: 200 },
                    { label: "Over $200", min: 200, max: null },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setFilters({ priceMin: p.min, priceMax: p.max })}
                      className="rounded-full border border-[#d4af37]/30 bg-[#fffaf2] px-3 py-1 text-xs hover:bg-[#f7eeda]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Listing type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Listing type</label>
                <div className="flex flex-wrap gap-2">
                  {["intact", "partial", "decant"].map((t) => {
                    const active = (filters.types ?? []).includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const set = new Set(filters.types ?? []);
                          active ? set.delete(t) : set.add(t);
                          setFilters({ types: Array.from(set) });
                        }}
                        className={`rounded-full px-3 py-1 text-xs border ${
                          active
                            ? "border-[#d4af37] bg-[#fff6dc] text-[#1a1a1a]"
                            : "border-[#d4af37]/30 bg-[#fffaf2] hover:bg-[#f7eeda]"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Filter Tags */}
            {filters.brand || filters.q ? (
              <div className="mt-6 border-t border-black/5 pt-6">
                <div className="flex flex-wrap gap-2">
                  {filters.brand && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm">
                      Brand: {filters.brand}
                      <button
                        onClick={() => setFilters({ brand: "" })}
                        className="hover:text-[#d4af37]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                  {filters.priceMin !== null || filters.priceMax !== null ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm">
                      Price: {filters.priceMin ?? 0} – {filters.priceMax ?? "∞"}
                      <button
                        onClick={() => setFilters({ priceMin: null, priceMax: null })}
                        className="hover:text-[#d4af37]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null}
                  {(filters.types?.length ?? 0) > 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm">
                      Type: {(filters.types ?? []).map(t => t[0].toUpperCase() + t.slice(1)).join(", ")}
                      <button onClick={() => setFilters({ types: [] })} className="hover:text-[#d4af37]">
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Perfume Results */}
        <PerfumeGrid
          perfumes={filteredPerfumes}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
