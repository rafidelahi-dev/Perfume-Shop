import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabase } from "@/lib/supabaseServer";

const resendApiKey = process.env.RESEND_API_KEY;
const supportEmail = process.env.SUPPORT_EMAIL;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: Request) {
  if (!resend || !supportEmail) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { email, category, subject, message } = body;

  if (!email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 1. SEND EMAIL
  try {
    const { error } = await resend.emails.send({
      from: "User's Voice <rafidelahi@cloudperfumebd.com>",
      to: [supportEmail],
      subject: category ? `[${category}] ${subject}` : subject,
      replyTo: email,
      text: `From: ${email}\n\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Email failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("Resend threw:", err);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }


  // 2. (OPTIONAL) STORE IN SUPABASE
  const supabase = await createServerSupabase();

  const { error: insertError } = await supabase.from("support_messages").insert({
    email,
    category,
    subject,
    message,
  });
  if (insertError) {
    console.warn("support_messages insert failed:", insertError.message);
  }

  return NextResponse.json({ success: true });
}
