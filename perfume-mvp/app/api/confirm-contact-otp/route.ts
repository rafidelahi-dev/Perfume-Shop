import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { phone, otp } = (await req.json()) as {
      phone?: string;
      otp?: string;
    };

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone and OTP are required" },
        { status: 400 }
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("confirm-contact-otp: no session", sessionError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: ok, error } = await supabase.rpc("confirm_contact_otp", {
      p_phone: phone,
      p_otp: otp,
    });

    if (error) {
      console.error("confirm_contact_otp error:", error);
      return NextResponse.json(
        { error: "Failed to verify OTP" },
        { status: 500 }
      );
    }

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("confirm-contact-otp fatal:", err);
    return NextResponse.json(
      { error: "Unexpected error while verifying OTP" },
      { status: 500 }
    );
  }
}
