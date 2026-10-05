import { supabase } from "../supabaseClient";

// supabase-js serializes all auth calls behind one lock per tab/storage-key.
// A stale/corrupted local session can hang that lock forever, taking
// getSession/getUser/signOut down with it — this timeout keeps auth UI
// from hanging forever when that happens (fresh tab/storage is the only
// other way it currently unsticks itself).
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(fallback), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            () => { clearTimeout(timer); resolve(fallback); }
        );
    });
}

export async function getSessionUserId(): Promise<string> {
    const {data, error} = await supabase.auth.getUser();
    if(error) throw error;
    const id = data.user?.id;
    if(!id) throw new Error("Not Authenticated");
    return id;
}

export async function getSession() {
    const result = await withTimeout(supabase.auth.getSession(), 4000, { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    return result.data.session ?? null;
}

export async function getUserProfile() {
    const session = await getSession();
    const user = session?.user;

    if(!user) return { 
        user: null, 
        profile: null,
    }

    const {data: profile} = await supabase.from("profiles").select("username, display_name, avatar_url, role").eq("id", user.id).single();

    return {
        user,
        profile: profile ?? null,
    }
}