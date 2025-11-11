"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,        // 5 minutes: don't refetch on re-mount within 5 min
        gcTime: 60 * 60 * 1000,           // (React Query v5) cacheTime -> gcTime; 1 hour in cache
        refetchOnWindowFocus: false,      // don't refetch just because window focused
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  }));
  return <QueryClientProvider client={client}>
      {children}
      {/* Toast portal */}
      <Toaster richColors position="top-center" />
    </QueryClientProvider>;
}
