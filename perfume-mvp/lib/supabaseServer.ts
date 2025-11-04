// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types";

export function createServerSupabase() {
  // ✅ READ-ONLY in Server Components
  return createServerComponentClient({ cookies });
  // return createServerComponentClient<Database>({ cookies });
}
