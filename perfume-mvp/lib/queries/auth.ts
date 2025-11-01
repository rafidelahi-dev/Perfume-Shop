import { supabase } from "../supabaseClient";

export async function getSessionUserId(): Promise<string> {
    const {data, error} = await supabase.auth.getUser();
    if(error) throw error;
    const id = data.user?.id;
    if(!id) throw new Error("Not Authenticated");
    return id;
}