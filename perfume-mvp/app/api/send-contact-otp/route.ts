import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const { phone } = (await req.json()) as { phone?: string };

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Make sure user is logged in
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("send-contact-otp: no session", sessionError);
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const apiKey = process.env.BULKSMSBD_API_KEY;
    const senderId = process.env.BULKSMSBD_SENDER_ID || "Random";

    if (!apiKey) {
      console.error("BULKSMSBD_API_KEY is not set");
      return NextResponse.json(
        { error: "SMS gateway not configured" },
        { status: 500 }
      );
    }

    const normalized = phone.trim();
    if (!/^\+8801\d{9}$/.test(normalized)) {
      return NextResponse.json({ error: "Invalid phone format. Use +8801*********" }, { status: 400 });
    }

    const { data: existing, error: existingError} = await supabase
      .from("profiles")
      .select("id")
      .eq("contact_number", normalized)
      .eq("phone_verified", true)
      .limit(1)
      .maybeSingle();

      if(existingError){
        console.error("Phone lookup error:", existingError);
        return NextResponse.json(
          { error: "Unable to verify phone number right now"},
          { status: 500},
        )
      }

      if(existing && existing.id !== session.user.id){
        return NextResponse.json(
          { error: "The phone number is already verfied by another account"},
          { status: 409},
        )
      }

    // 1) Ask Supabase to create + store an OTP (does NOT send SMS)
    const { data: otp, error } = await supabase.rpc("send_contact_otp", {
      p_phone: phone,
    });

    if (error) {
      console.error("send_contact_otp error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate OTP" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string") {
      console.error("send_contact_otp returned no OTP:", otp);
      return NextResponse.json(
        { error: "No OTP generated" },
        { status: 500 }
      );
    }

    const smsBody = `Your Cloud PerfumeBd verification code is ${otp}. It will expire in 5 minutes.`;

    const bodyParams = new URLSearchParams({
      api_key: apiKey,
      senderid: senderId,
      number: phone,
      message: smsBody,
    });

    const smsResponse = await fetch("https://bulksmsbd.net/api/smsapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const smsText = await smsResponse.text();

    if (!smsResponse.ok) {
      console.error("BulkSMSBD error:", smsResponse.status, smsText);
      return NextResponse.json(
        { error: "Failed to send SMS, please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-contact-otp fatal:", err);
    return NextResponse.json(
      { error: "Unexpected error while sending OTP" },
      { status: 500 }
    );
  }
}
