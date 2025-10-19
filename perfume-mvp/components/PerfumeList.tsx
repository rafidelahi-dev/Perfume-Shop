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
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  // Loading State
  if (isLoading) return <PerfumeListLoading />;
  
  // Error State
  if (error) return <PerfumeListError onRetry={refetch} />;
  
  // Empty State
  if (!data?.length) return <PerfumeListEmpty />;

  return (
    <div className="space-y-6">
      {/* Header with Stats and Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {data.length} Fragrances Found
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Discover your perfect scent from our curated collection
          </p>
        </div>
        
        <button 
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Perfume Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.map((perfume: any) => (
          <PerfumeCard 
            key={perfume.id}
            perfume={perfume}
            isFavorite={favorites.has(perfume.id)}
            onToggleFavorite={() => toggleFavorite(perfume.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Perfume Card Component
function PerfumeCard({ perfume, isFavorite, onToggleFavorite }: { 
  perfume: any; 
  isFavorite: boolean; 
  onToggleFavorite: () => void; 
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate a placeholder image URL based on brand and name
  const placeholderImage = `https://images.unsplash.com/photo-1541643600914-78b084683601?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80`;

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Heart 
          className={`w-4 h-4 transition-all duration-200 ${
            isFavorite 
              ? 'fill-rose-500 text-rose-500 scale-110' 
              : 'text-gray-400 hover:text-rose-400'
          }`}
        />
      </button>

      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-rose-50 to-amber-50 overflow-hidden">
        {!imageError ? (
          <img
            src={perfume.image_url || placeholderImage}
            alt={`${perfume.brand} ${perfume.name}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-rose-200" />
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Brand */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-rose-600 uppercase tracking-wide">
            {perfume.brand}
          </span>
          {perfume.rating && (
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-medium">{perfume.rating}</span>
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-rose-700 transition-colors">
          {perfume.name}
        </h3>

        {/* Notes */}
        {perfume.notes && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
            {perfume.notes}
          </p>
        )}

        {/* Price & Action */}
        <div className="flex items-center justify-between mt-4">
          {perfume.price ? (
            <span className="text-lg font-semibold text-gray-900">
              ${parseFloat(perfume.price).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Price on request</span>
          )}
          
          <button className="flex items-center gap-1 px-3 py-2 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-all duration-200 group/btn">
            <ShoppingBag className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading Component
function PerfumeListLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded-full w-32 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-8 bg-gray-200 rounded-full w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Error Component
function PerfumeListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-8 h-8 text-rose-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Unable to Load Fragrances
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        We encountered an issue while loading the perfume collection. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors duration-200 font-medium"
      >
        Try Again
      </button>
    </div>
  );
}

// Empty State Component
function PerfumeListEmpty() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-10 h-10 text-amber-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        No Fragrances Found
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        We couldn't find any perfumes matching your criteria. Try adjusting your filters or search terms.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors duration-200 font-medium"
        >
          Clear Filters
        </button>
        <button
          onClick={() => window.location.href = '/contact'}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors duration-200 font-medium"
        >
          Request a Scent
        </button>
      </div>
    </div>
  );
}