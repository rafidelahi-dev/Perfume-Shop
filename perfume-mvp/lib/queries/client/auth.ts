import { supabase } from "@/lib/supabaseClient";

const BD_PHONE_RE = /^\+8801\d{9}$/;

/**
 * Normalizes a BD phone number to +8801XXXXXXXXX.
 * Accepts +8801XXXXXXXXX, 8801XXXXXXXXX, or 01XXXXXXXXX.
 */
export function normalizeBdPhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("880")) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+880${trimmed.slice(1)}`;
  return trimmed;
}

export function isValidBdPhone(raw: string): boolean {
  return BD_PHONE_RE.test(normalizeBdPhone(raw));
}

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

export async function signUpWithPhone(
  phone: string,
  password: string,
  options?: { data?: Record<string, unknown> }
) {
  const normalized = normalizeBdPhone(phone);
  if (!BD_PHONE_RE.test(normalized)) {
    return {
      data: { user: null, session: null },
      error: { name: "InvalidPhone", message: "Invalid phone format. Use 01XXXXXXXXX." },
    } as const;
  }
  return supabase.auth.signUp({ phone: normalized, password, options });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const normalized = normalizeBdPhone(phone);
  return supabase.auth.verifyOtp({ phone: normalized, token, type: "sms" });
}

export async function signInSmart(identifier: string, password: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return supabase.auth.signInWithPassword({ email: trimmed, password });
  }
  const normalized = normalizeBdPhone(trimmed);
  if (!BD_PHONE_RE.test(normalized)) {
    return {
      data: { user: null, session: null },
      error: { name: "InvalidIdentifier", message: "Enter a valid email or phone number (01XXXXXXXXX)." },
    } as const;
  }
  return supabase.auth.signInWithPassword({ phone: normalized, password });
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
