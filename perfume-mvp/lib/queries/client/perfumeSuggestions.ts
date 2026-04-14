import { supabase } from "@/lib/supabaseClient";

export type PerfumeSuggestion = {
  brand: string;
  perfume_name: string;
  sub_brand: string | null;
};

export async function fetchPerfumeSuggestions(): Promise<PerfumeSuggestion[]> {
  const { data, error } = await supabase
    .from("perfume_score")
    .select("brand, perfume_name, sub_brand");
  if (error) throw error;
  return (data ?? []) as PerfumeSuggestion[];
}
