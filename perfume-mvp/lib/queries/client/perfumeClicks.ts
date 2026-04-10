import { supabase } from "@/lib/supabaseClient";

export async function registerPerfumeClick(
  perfumeId: string | null | undefined
): Promise<void> {
  if (!perfumeId) return;
  const { error } = await supabase.rpc("increment_perfume_click", {
    p_perfume_id: perfumeId,
  });
  if (error) console.warn("increment_perfume_click failed:", error.message);
}
