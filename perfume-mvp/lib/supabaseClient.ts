// lib/supabaseClient.ts
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/database.types"; // if you have types

export const supabase = createClientComponentClient(); 
// export const supabase = createClientComponentClient<Database>();
