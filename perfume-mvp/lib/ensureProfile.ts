import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";

/** Call this after login/signup or on app start. */
export async function ensureProfile() {
  const { data, error: userError } = await withTimeout(
    supabase.auth.getUser(),
    4000,
    { data: { user: null }, error: null } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>
  );

  if (userError) {
    console.warn("ensureProfile getUser error:", userError.message);
    return null;
  }

  const user = data.user;
  if (!user) return null;

  // try to fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, full_name, avatar_url, email, contact_number, phone_verified")
    .eq("id", user.id)
    .single();

  if(profile){
    if(!profile.email && user.email){
      // This should be rare, but if we have a user without a profile, we can try to create one
      await supabase
      .from("profiles")
      .update({email: user.email})
      .eq("id", user.id);
      profile.email = user.email;

    }
    if(!profile.contact_number && user.phone){
      await supabase
      .from("profiles")
      .update({ contact_number: user.phone, phone_verified: !!user.phone_confirmed_at })
      .eq("id", user.id);
      profile.contact_number = user.phone;
      profile.phone_verified = !!user.phone_confirmed_at;
    }
    return profile;
  }



  // Insert a minimal profile if missing (should be rare thanks to trigger)
  const username = (user.user_metadata?.user_name ||
                    user.user_metadata?.preferred_username ||
                    user.email?.split("@")[0] ||
                    `user_${user.id.substring(0, 8)}`).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";

  const displayName =
    user.user_metadata?.name ||
    username;

  const avatar = user.user_metadata?.picture || null;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      email: user.email,
      display_name: displayName,
      full_name: user.user_metadata?.name || null,
      avatar_url: avatar,
      contact_number: user.phone || null,
      phone_verified: !!user.phone_confirmed_at,
    })
    .select()
    .single();

  if (error) {
    console.warn("ensureProfile insert failed:", error.message);
    return null;
  }
  return created;
}
