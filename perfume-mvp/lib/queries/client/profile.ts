import { supabase } from "@/lib/supabaseClient";
import { getSession } from "./auth";

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
  const session = await getSession();
  const user = session?.user;
  if (!user) throw new Error("Not Authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return {
    ...(data as Profile),
    email: user.email ?? null,
  };
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<void> {
  const session = await getSession();
  const user = session?.user;
  if (!user) throw new Error("Not Authenticated");

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
    .eq("id", user.id);
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
  if (error) throw error;
  return !data?.length;
}
