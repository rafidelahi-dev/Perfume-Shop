import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!accessToken) return new NextResponse("Missing token", { status: 401 });

    // 1) Verify which user is calling, using the access token
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: userRes, error: userErr } = await anon.auth.getUser(accessToken);
    if (userErr || !userRes.user) return new NextResponse("Invalid session", { status: 401 });

    const userId = userRes.user.id;

    // 2) Use the service role to delete the user
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // SECRET on server only
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return new NextResponse(delErr.message, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
