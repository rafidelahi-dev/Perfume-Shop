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
      
      {/* Hero Section - Matching your luxury theme */}
      <section className="relative bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#d4af37] animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-light mb-6 tracking-wide">
            Discover Your Signature Scent
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Explore our curated collection of luxury fragrances that tell your unique story
          </p>
        </div>
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E')]"></div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header with Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-light text-[#1a1a1a] mb-3">Perfume Collection</h2>
            <p className="text-lg text-[#666]">Find the perfect fragrance for every occasion</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className={`flex items-center gap-3 px-8 py-4 rounded-full transition-all duration-300 font-medium ${
                isOpen 
                  ? "bg-[#1a1a1a] text-white shadow-2xl" 
                  : "bg-white/80 text-[#1a1a1a] border border-gray-200/80 hover:shadow-xl backdrop-blur-sm"
              }`}
            >
              <Filter className="w-5 h-5" />
              {isOpen ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Enhanced Filter Panel */}
        {isOpen && (
          <div className="mb-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/40 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-light text-[#1a1a1a]">Refine Your Search</h3>
              <button 
                onClick={reset}
                className="flex items-center gap-3 text-base text-[#666] hover:text-[#1a1a1a] transition-colors font-medium"
              >
                <X className="w-5 h-5" />
                Reset All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Brand Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  Brand
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all duration-200 bg-white/90 backdrop-blur-sm"
                    placeholder="e.g., Dior, Chanel"
                    value={filters.brand}
                    onChange={(e) => setFilters({ brand: e.target.value })}
                  />
                </div>
              </div>

              {/* General Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  Search Fragrances
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all duration-200 bg-white/90 backdrop-blur-sm"
                    placeholder="Notes, occasion, mood..."
                    value={filters.q}
                    onChange={(e) => setFilters({ q: e.target.value })}
                  />
                </div>
              </div>

              {/* Additional Filter Placeholders */}
              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  Scent Family
                </label>
                <select className="w-full px-4 py-4 rounded-2xl border border-gray-300/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all duration-200 bg-white/90 backdrop-blur-sm">
                  <option>All Families</option>
                  <option>Floral</option>
                  <option>Woody</option>
                  <option>Fresh</option>
                  <option>Oriental</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a1a] mb-3">
                  Price Range
                </label>
                <select className="w-full px-4 py-4 rounded-2xl border border-gray-300/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all duration-200 bg-white/90 backdrop-blur-sm">
                  <option>All Prices</option>
                  <option>Under $50</option>
                  <option>$50 - $100</option>
                  <option>$100 - $200</option>
                  <option>Over $200</option>
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.brand || filters.q) && (
              <div className="mt-8 pt-8 border-t border-gray-200/50">
                <div className="flex flex-wrap gap-3">
                  {filters.brand && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4af37]/10 text-[#1a1a1a] text-sm font-medium border border-[#d4af37]/20">
                      Brand: {filters.brand}
                      <button 
                        onClick={() => setFilters({ brand: '' })}
                        className="hover:text-[#d4af37] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                  {filters.q && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4af37]/10 text-[#1a1a1a] text-sm font-medium border border-[#d4af37]/20">
                      Search: {filters.q}
                      <button 
                        onClick={() => setFilters({ q: '' })}
                        className="hover:text-[#d4af37] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Perfume List Container */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-sm border border-white/30 overflow-hidden">
          <PerfumeList />
        </div>
      </div>
    </div>
  );
}