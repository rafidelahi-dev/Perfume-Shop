// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
// import type { Database } from "@/lib/database.types";

export async function createServerSupabase() {
  // Next.js 15 expects cookies() to be awaited in async helpers
  const cookieStore = await cookies();

  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Called by Supabase to read the current cookies
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // These will run in Route Handlers / Server Actions / Proxy,
        // but might also be called from Server Components.
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore if called from a pure Server Component – it can't
            // actually write cookies, but that's fine.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above: safe to ignore in RSC context.
          }
        },
      },
    }
  );

  return supabase;

  // If you use types:
  // return createServerClient<Database>( ...same config... );
}
