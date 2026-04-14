"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchPerfumeSuggestions,
  type PerfumeSuggestion,
} from "@/lib/queries/client/perfumeSuggestions";

const SEED_BRANDS: string[] = [
  // Middle Eastern — strong Bangladesh market presence
  "Armaf", "Lattafa", "Al Haramain", "Rasasi", "Swiss Arabian",
  "Ajmal", "Nabeel", "Paris Corner", "Ard Al Zaafaran", "Zimaya",
  "Afnan", "Fragrance World", "Maison Alhambra", "Oud Elite",
  "Ahmed Al Maghribi", "Emper", "Surrati", "Khadlaj", "Orientica", "Arabiyat",
  // International
  "Dior", "Chanel", "Tom Ford", "Creed", "Yves Saint Laurent",
  "Giorgio Armani", "Versace", "Paco Rabanne", "Guerlain", "Jean Paul Gaultier",
  "Hermès", "Burberry", "Calvin Klein", "Hugo Boss", "Davidoff",
  "Montblanc", "Bvlgari", "Carolina Herrera", "Viktor & Rolf", "Thierry Mugler",
  "Narciso Rodriguez", "Marc Jacobs", "Gucci", "Dolce & Gabbana", "Valentino",
  "Givenchy", "Azzaro", "Joop", "Lancôme", "Penhaligon's",
  "Jo Malone", "Maison Margiela", "Byredo", "Le Labo",
];

export function usePerfumeAutocomplete() {
  const { data: allRecords = [] } = useQuery<PerfumeSuggestion[]>({
    queryKey: ["perfume-suggestions"],
    queryFn: async () => {
      const dbRecords = await fetchPerfumeSuggestions();
      const dbBrands = new Set(dbRecords.map((r) => r.brand.toLowerCase()));
      const seedRecords: PerfumeSuggestion[] = SEED_BRANDS.filter(
        (b) => !dbBrands.has(b.toLowerCase())
      ).map((b) => ({ brand: b, perfume_name: "", sub_brand: null }));
      return [...dbRecords, ...seedRecords];
    },
    staleTime: Infinity,
  });

  function brandSuggestions(query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (r.brand.toLowerCase().includes(lower) && !seen.has(r.brand)) {
        seen.add(r.brand);
        results.push(r.brand);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  function nameSuggestions(brand: string, query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const brandLower = brand.trim().toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (!r.perfume_name) continue;
      if (brandLower && r.brand.toLowerCase() !== brandLower) continue;
      if (r.perfume_name.toLowerCase().includes(lower) && !seen.has(r.perfume_name)) {
        seen.add(r.perfume_name);
        results.push(r.perfume_name);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  function subBrandSuggestions(brand: string, query: string): string[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const brandLower = brand.trim().toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const r of allRecords) {
      if (!r.sub_brand) continue;
      if (brandLower && r.brand.toLowerCase() !== brandLower) continue;
      if (r.sub_brand.toLowerCase().includes(lower) && !seen.has(r.sub_brand)) {
        seen.add(r.sub_brand);
        results.push(r.sub_brand);
        if (results.length === 8) break;
      }
    }
    return results;
  }

  function onNameSelect(
    name: string,
    currentBrand: string
  ): { brand: string; sub_brand: string | null } {
    const nameLower = name.toLowerCase();
    const matches = allRecords.filter(
      (r) => r.perfume_name.toLowerCase() === nameLower
    );
    if (matches.length === 0) return { brand: currentBrand, sub_brand: null };
    const brandMatch = matches.find(
      (r) => r.brand.toLowerCase() === currentBrand.trim().toLowerCase()
    );
    const record = brandMatch ?? matches[0];
    return { brand: record.brand, sub_brand: record.sub_brand };
  }

  return { brandSuggestions, nameSuggestions, subBrandSuggestions, onNameSelect };
}
