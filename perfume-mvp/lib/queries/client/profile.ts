import { supabase } from "@/lib/supabaseClient";
import { getSessionUserId } from "./auth";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  contact_number: string | null;
  messenger_link: string | null;
  facebook_link: string | null;
  whatsapp_number: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
  email?: string | null;
  phone_verified?: boolean;
};

export async function fetchMyProfile(): Promise<Profile> {
  const userId = await getSessionUserId();
  const [{ data: sessionData }, { data, error }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ]);
  if (error) throw error;
  return {
    ...(data as Profile),
    email: sessionData.session?.user?.email ?? null,
  };
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const userId = await getSessionUserId();
  const payload = {
    display_name: patch.display_name ?? null,
    avatar_url: patch.avatar_url ?? null,
    contact_number: patch.contact_number ?? null,
    messenger_link: patch.messenger_link ?? null,
    facebook_link: patch.facebook_link ?? null,
    whatsapp_number: patch.whatsapp_number ?? null,
    website: patch.website ?? null,
    location: patch.location ?? null,
    bio: patch.bio ?? null,
  };
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);
  if (error) throw error;
}

export async function checkUsernameAvailability(
  username: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);
  return !data?.length && !error;
}
