import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";

export async function fetchMyPerfumes() {
    const userId = await getSessionUserId();
    const { data, error} = await supabase.from("user_perfumes").select("*").eq("user_id", userId).order("created_at", {ascending: false})
    if(error) throw error;
    return data ?? [];
}

export async function insertMyPerfumes(input: {brand: string; sub_brand?: string; name: string; images: string[]}){
    const userId = await getSessionUserId();
    const {error} = await supabase.from("user_perfumes").insert({
        user_id: userId,
        brand: input.brand,
        sub_brand: input.sub_brand || null,
        name: input.name,
        images: input.images,  
    })
    if(error) throw error;
}

export async function deleteMyPerfume(input: {id: string}){
    const userId = await getSessionUserId();
    const {error} = await supabase.from("user_perfumes").delete().eq("id", input.id).eq("user_id", userId);
    if(error) throw error;
}

export async function updateMyPerfume(input: {
  id: string;
  brand: string;
  sub_brand?: string | null;
  name: string;
  images: string[];
}) {
  const userId = await getSessionUserId();
  const { error } = await supabase
    .from("user_perfumes")
    .update({
      brand: input.brand,
      sub_brand: input.sub_brand ?? null,
      name: input.name,
      images: input.images,
    })
    .eq("id", input.id)
    .eq("user_id", userId); // RLS: ensure the row belongs to the user
  if (error) throw error;
}