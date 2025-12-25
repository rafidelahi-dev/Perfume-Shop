"use client";

import Image from "next/image";
import Link from "next/link";
import DecantOptions from "./DecantOptions";
import { supabase } from "@/lib/supabaseClient";
import type { PerfumeListing, SellerProfile } from "@/types/perfume";


type PerfumeGridProps = {
 perfumes: PerfumeListing[];
 isLoading: boolean;
  error: unknown | null;
};

// ✅ Use min_price for decants; otherwise normal price
function effectivePrice(p: PerfumeListing) {
  if ((p.type ?? "").toLowerCase() === "decant" && p.min_price != null) {
    return Number(p.min_price);
  }
  return Number(p.price ?? NaN);
}

// ✅ Badge text under price
function typeBadge(p: PerfumeListing) {
  const t = (p.type ?? "").toLowerCase();
  if (t === "decant")
    return p.decant_options ? `Decant • Various Sizes` : "Decant"; // Changed badge text to reflect DecantOptions usage
  if (t === "partial")
    return p.partial_left_ml
      ? `Partial • ${p.partial_left_ml} ml left`
      : "Partial";
  if (t === "intact") return "Intact";
  return null;
}

async function registerPerfumeClick(perfumeId?: string | null) {

  if (!perfumeId) {
    console.warn("⚠️ No perfumeId provided — click not counted.");
    return;
  }

  try {
    const { data, error } = await supabase.rpc("increment_perfume_click", {
      p_perfume_id: perfumeId,
    });

  } catch (err) {
    console.error("🔥 Unexpected error (network or client):", err);
  }
}


// -----------------------------
// Component
// -----------------------------
export default function PerfumeGrid({
  perfumes,
  isLoading,
  error,
}: PerfumeGridProps) {
  if (error)
  { 
    const message = error instanceof Error ? error.message : "Failed to load perfumes";
    return (
        <div className="text-center mt-12 p-6 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 font-medium">Error loading listings:</p>
            <p className="text-sm text-red-600 italic">{message}</p>
        </div>
    );
  }

  if (isLoading)
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-[#f5f1e8]"
          ></div>
        ))}
      </div>
    );

  if (!perfumes.length)
    return (
      <p className="text-center text-gray-500 mt-12 italic font-light">
        No perfumes found matching your filters.
      </p>
    );

    


  return (
    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {perfumes.map((p) => {
        const thumb = Array.isArray(p.images) ? p.images[0] : null;
        const priceToShow = effectivePrice(p);
        const badge = typeBadge(p);

        return (
          <li key={p.id}>
            <Link
              href={`/perfumes/${p?.profiles?.username}/${p.id}`}
              prefetch={false}
              onClick={() => registerPerfumeClick(p.perfume_id)}
              // Card Styling
              className="block group rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#d4af37]/30"
            >
              {/* ---------------- Image ---------------- */}
              <div className="aspect-[3/4] relative bg-[#f9f6ef] overflow-hidden">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={p.perfume_name || "Perfume"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#f2eee4] text-[#aaa] text-sm">
                    No Image
                  </div>
                )}
              </div>

              {/* ---------------- Content ---------------- */}
              <div className="p-4">
                {/* Brand */}
                <p className="text-xs uppercase tracking-wider font-medium text-gray-500 truncate mb-1">
                  {p.brand} {p.sub_brand && <span className="text-[#d4af37]"> • </span>} {p.sub_brand}
                </p>

                {/* Perfume Name - Serif Font */}
                <h3 className="text-lg font-serif font-semibold text-[#1a1a1a] truncate group-hover:text-[#d4af37] transition">
                  {p.perfume_name}
                </h3>

                {/* Price & Type */}
                <div className="mt-2">
                  <p className="text-[#1a1a1a] font-bold text-lg">
                    {Number.isFinite(priceToShow)
                      ? `TK${priceToShow.toFixed(2)}`
                      : "—"}
                    <span className="text-xs font-light text-gray-500 ml-1">TK</span>
                  </p>
                  
                  {/* The badge for Intact/Partial */}
                  {badge && (p.type ?? "").toLowerCase() !== "decant" && (
                    <span className="mt-1 inline-block text-[11px] rounded-full bg-[#f9f6ef] border border-gray-100 px-2.5 py-0.5 text-[#555] font-medium">
                      {badge}
                    </span>
                  )}
                  
                  {/* Decant Options component */}
                  {(p.type ?? "").toLowerCase() === "decant" &&
                    Array.isArray(p.decant_options) &&
                    p.decant_options.length > 0 && (
                      <DecantOptions
                        options={p.decant_options}
                        maxInline={3}
                      />
                    )}
                </div>

                {/* Seller Info */}
                {p.profiles && (
                  <p className="text-xs text-gray-500 mt-3 border-t border-gray-50/50 pt-3">
                    Listed by{" "}
                    <span className="font-semibold text-[#1a1a1a]">
                      {p.profiles.display_name ?? p.profiles.username}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}