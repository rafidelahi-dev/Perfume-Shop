import { supabase } from "../supabaseClient";
import { getSessionUserId } from "./auth";

export async function uploadToBucket(bucket: string, files: File[]){
    const userId = await getSessionUserId();
    const urls: string[] = [];
    for(const file of files){
        const ext = file.name.split(".").pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${Date.now()}-${safeName}`;
        const {error} = await supabase.storage.from(bucket).upload(path, file, {
            cacheControl: "3600", 
            upsert: true
        })
        if (error) throw error;
        const {data} = supabase.storage.from(bucket).getPublicUrl(path);
        urls.push(data.publicUrl)
    }
    return urls;
}