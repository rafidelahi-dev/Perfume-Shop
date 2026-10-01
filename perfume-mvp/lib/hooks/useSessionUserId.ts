"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/queries/auth";

/**
 * Lightweight hook to expose the current session user id.
 * Centralises the auth.getUser + onAuthStateChange pattern so
 * we don't spin up duplicate listeners in each dashboard page.
 */
export function useSessionUserId() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await withTimeout(
        supabase.auth.getUser(),
        4000,
        { data: { user: null } } as Awaited<ReturnType<typeof supabase.auth.getUser>>
      );
      if (!cancelled) {
        setUserId(data.user?.id ?? null);
      }
    };

    void load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          setUserId(session?.user?.id ?? null);
        }
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return userId;
}

