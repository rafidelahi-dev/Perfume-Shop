// /lib/queries/profile.ts
"use client";

import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "@/lib/queries/auth";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  contact_link: string | null;
  messenger_link: string | null;
  whatsapp_number: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
  // not stored in table:
  email?: string | null;
};

/** Read currently logged-in user's profile (adds email from session) */
export async function fetchMyProfile(): Promise<Profile> {
  const userId = await getSessionUserId(); // centralized user fetch
  const [{ data: sessionData }, { data, error }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);
  if (error) throw error;
  return { ...(data as Profile), email: sessionData.session?.user?.email ?? null };
}

/** Update my profile (RLS requires auth.uid() = id) */
export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const userId = await getSessionUserId();
  const payload = {
    display_name: patch.display_name ?? null,
    avatar_url: patch.avatar_url ?? null,
    contact_link: patch.contact_link ?? null,
    messenger_link: patch.messenger_link ?? null,
    whatsapp_number: patch.whatsapp_number ?? null,
    website: patch.website ?? null,
    location: patch.location ?? null,
    bio: patch.bio ?? null,
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw error;
}

/** Change password (MVP: direct update) */
export async function changeMyPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Upload a single avatar image to the 'avatars' bucket */