// lib/hooks/useAuthProfile.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getSession, getUserProfile } from "@/lib/queries/auth";

export function useAuthProfile() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadFromSession = useCallback(async () => {
    setLoading(true);
    const session = await getSession();
    const user = session?.user || null;

    if (!user) {
      setIsAuthenticated(false);
      setEmail(null);
      setDisplayName(null);
      setLoading(false);
      return;
    }

    const { profile } = await getUserProfile();
    setIsAuthenticated(true);
    setEmail(user.email ?? null);
    setDisplayName(profile?.display_name || profile?.username || "User");
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadFromSession();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // 🔑 React instantly to sign-in/sign-out
      if (event === "SIGNED_OUT" || !session?.user) {
        setIsAuthenticated(false);
        setEmail(null);
        setDisplayName(null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // We have a user – fetch profile (async)
        loadFromSession();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription?.unsubscribe();
    };
  }, [loadFromSession]);

  return { loading, isAuthenticated, email, displayName };
}
