import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();

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
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("confirm-contact-otp: no user", userError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (!rateLimit(`otp-confirm:${user.id}`, 10, 10 * 60 * 1000)) {
      return tooManyRequests();
    }

    const admin = createAdminClient();
    const { data: ok, error } = await admin.rpc("admin_confirm_contact_otp", {
      p_user_id: user.id,
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
