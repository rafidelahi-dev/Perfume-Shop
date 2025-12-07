// app/api/account/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(_req: NextRequest) {
  try {
    // 1) Get the currently logged-in user from Supabase cookies
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return new NextResponse("Not authenticated", { status: 401 });
    }

    // 2) Use the service role to delete that user
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new NextResponse(delErr.message, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return new NextResponse(msg, { status: 500 });
  }
}
