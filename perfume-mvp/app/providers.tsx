"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "sonner";

// ------------------------------
// 🔁 AuthWatcher component
// ------------------------------
function AuthWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        console.log("🧹 User logged out → clearing React Query cache");
        queryClient.clear(); // Clears all cached queries + mutations
      } else {
        console.log("✅ User logged in:", session.user.email);
        queryClient.invalidateQueries();
      }
    });

    // Cleanup subscription when component unmounts
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}

// ------------------------------
// 🌐 Main Provider Wrapper
// ------------------------------
export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 60 * 60 * 1000,   // 1 hour
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {/* 👇 This listens to login/logout and clears cache */}
      <AuthWatcher />

      {children}

      {/* Toast notifications */}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
