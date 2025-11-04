// lib/hooks/useAuthProfile.ts
"use client";

import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/queries/auth";
import { supabase } from "@/lib/supabaseClient";

export function useAuthProfile() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { user, profile } = await getUserProfile();

      if (cancelled) return;

      setEmail(user?.email ?? null);
      setDisplayName(
        profile?.display_name || profile?.username || (user ? "User" : null)
      );
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      cancelled = true;
      sub.subscription?.unsubscribe();
    };
  }, []);

  return {
    loading,
    email,
    displayName,
  };
}
