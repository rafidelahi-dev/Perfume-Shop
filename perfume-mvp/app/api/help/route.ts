import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";

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

  if (!rateLimit(`help:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return tooManyRequests("Too many messages sent, please try again later.");
  }

  const body = await req.json();
  const { email, category, subject, message } = body;

  if (!email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (String(message).length > 5000 || String(subject).length > 200) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
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


  // 2. (OPTIONAL) STORE IN SUPABASE — service role; RLS insert policy removed
  const supabase = createAdminClient();

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
