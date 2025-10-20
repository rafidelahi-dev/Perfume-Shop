"use client";

import Header from "@/components/Header";
import PerfumeList from "@/components/PerfumeList";
import { useUiStore } from "@/stores/useUiStore";
import { Search, Filter, X, Sparkles } from "lucide-react";

export default function PerfumesPage() {
  const isOpen = useUiStore((s) => s.isFilterOpen);
  const toggle = useUiStore((s) => s.toggleFilter);
  const filters = useUiStore((s) => s.filters);
  const setFilters = useUiStore((s) => s.setFilters);
  const reset = useUiStore((s) => s.resetFilters);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Warm, luxurious hero (no dark stripe) */}
      <section className="relative w-full bg-gradient-to-br from-[#f9f6ef] via-[#f5f1e8] to-[#efe9dc] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-8 w-8 text-[#d4af37]" />
          </div>
          <h1 className="text-center text-4xl md:text-5xl font-semibold tracking-tight text-[#111]">
            Discover your <span className="text-[#d4af37]">signature scent</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#444]">
            Explore our curated collection of luxury fragrances for every occasion.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Filters header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="mb-1 text-3xl font-light text-[#1a1a1a]">Perfume Collection</h2>
            <p className="text-[#666]">Find the perfect fragrance for every occasion</p>
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

        {/* Filter panel */}
        {isOpen && (
          <div className="mb-10 rounded-3xl border border-black/5 bg-[#fffdf7]/80 p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-light text-[#1a1a1a]">Refine your search</h3>
              <button onClick={reset} className="flex items-center gap-2 text-[#666] hover:text-[#1a1a1a]">
                <X className="h-4 w-4" />
                Reset all
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Brand</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-12 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                    placeholder="e.g., Dior, Chanel"
                    value={filters.brand}
                    onChange={(e) => setFilters({ brand: e.target.value })}
                  />
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Search fragrances</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-12 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
                    placeholder="Notes, occasion, mood…"
                    value={filters.q}
                    onChange={(e) => setFilters({ q: e.target.value })}
                  />
                </div>
              </div>

              {/* Family */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Scent family</label>
                <select className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20">
                  <option>All families</option>
                  <option>Floral</option>
                  <option>Woody</option>
                  <option>Fresh</option>
                  <option>Oriental</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">Price range</label>
                <select className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20">
                  <option>All prices</option>
                  <option>Under $50</option>
                  <option>$50 – $100</option>
                  <option>$100 – $200</option>
                  <option>Over $200</option>
                </select>
              </div>
            </div>

            {(filters.brand || filters.q) && (
              <div className="mt-6 border-t border-black/5 pt-6">
                <div className="flex flex-wrap gap-2">
                  {filters.brand && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm">
                      Brand: {filters.brand}
                      <button onClick={() => setFilters({ brand: "" })} className="hover:text-[#d4af37]">
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                  {filters.q && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm">
                      Search: {filters.q}
                      <button onClick={() => setFilters({ q: "" })} className="hover:text-[#d4af37]">
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 👉 No outer white panel anymore */}
        <PerfumeList />
      </div>
    </div>
  );
}
