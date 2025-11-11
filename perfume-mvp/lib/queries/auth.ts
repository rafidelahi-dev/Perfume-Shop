import { supabase } from "../supabaseClient";

export async function getSessionUserId(): Promise<string> {
    const {data, error} = await supabase.auth.getUser();
    if(error) throw error;
    const id = data.user?.id;
    if(!id) throw new Error("Not Authenticated");
    return id;
}

export async function getSession() {
    const {data} = await supabase.auth.getSession();
    return data.session ?? null;
}

export async function getUserProfile() {
    const session = await getSession();
    const user = session?.user;

    if(!user) return { 
        user: null, 
        profile: null,
    }

    const {data: profile} = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).single();

    return {
        user,
        profile: profile ?? null,
    }
}