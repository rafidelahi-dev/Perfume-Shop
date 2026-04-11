import { supabase } from "@/lib/supabaseClient";

export async function getSessionUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("Not Authenticated");
  return id;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function getUserProfile() {
  const session = await getSession();
  const user = session?.user;
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();
  return { user, profile: profile ?? null };
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(
  provider: "google",
  redirectTo?: string
) {
  return supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
}

export async function signUp(
  email: string,
  password: string,
  options?: { data?: Record<string, unknown> }
) {
  return supabase.auth.signUp({ email, password, options });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string, redirectTo: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export function onAuthStateChange(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  return supabase.auth.onAuthStateChange(callback);
}
