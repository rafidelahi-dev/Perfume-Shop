import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerSupabase } from "@/lib/supabaseServer";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.json();
  const { email, category, subject, message } = body;

  if (!email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 1. SEND EMAIL
  try {
  const { data, error } = await resend.emails.send({
    from: "User's Voice <rafidelahi@cloudperfumebd.com>",
    to: [process.env.SUPPORT_EMAIL!],
    subject: `[${category}] ${subject}`,
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

  await supabase.from("support_messages").insert({
    email,
    category,
    subject,
    message,
  });

  return NextResponse.json({ success: true });
}
