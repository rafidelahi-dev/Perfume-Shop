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
