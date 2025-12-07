// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
// import type { Database } from "@/lib/database.types"; // if you have types

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // You can use your typed version like:
  // process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  // { db: { schema: "public" } } // if needed
);

// Or with types:
// export const supabase = createBrowserClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
