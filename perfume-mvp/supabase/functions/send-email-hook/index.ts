import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// Standard Webhooks secret Supabase generates when you add this function
// as the Send Email hook (Authentication -> Hooks -> Send Email).
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.replace("v1,whsec_", "");

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromAddress = Deno.env.get("RESEND_FROM") || "Cloud PerfumeBD <no-reply@cloudperfumebd.com>";

// Auto-injected by Supabase for every edge function; no manual config needed.
const supabaseUrl = Deno.env.get("SUPABASE_URL");

type SendEmailPayload = {
  user: { email?: string };
  email_data: {
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  if (!hookSecret) {
    console.error("SEND_EMAIL_HOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "hook not configured" }), { status: 500 });
  }

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "email gateway not configured" }), { status: 500 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: SendEmailPayload;
  try {
    const wh = new Webhook(hookSecret);
    data = wh.verify(payload, headers) as SendEmailPayload;
  } catch (err) {
    console.error("send-email-hook: signature verification failed", err);
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
  }

  const email = data.user?.email;
  const actionType = data.email_data?.email_action_type;

  // Only the signup-confirmation email is replaced. Recovery, magic link,
  // and email-change emails keep using Supabase's default sender.
  if (actionType !== "signup") {
    return new Response(JSON.stringify({}), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenHash = data.email_data?.token_hash;
  const redirectTo = data.email_data?.redirect_to || "";
  const siteUrl = data.email_data?.site_url || supabaseUrl;

  if (!email || !tokenHash) {
    console.error("send-email-hook: missing email or token_hash in payload");
    return new Response(JSON.stringify({ error: "malformed payload" }), { status: 400 });
  }

  const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=signup&redirect_to=${encodeURIComponent(redirectTo || siteUrl || "")}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 20px; color: #111;">Confirm your Cloud PerfumeBD account</h1>
      <p style="color: #444; line-height: 1.5;">
        Tap the button below to confirm your email and activate your account.
      </p>
      <p style="margin: 28px 0;">
        <a href="${confirmUrl}"
           style="background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Confirm my email
        </a>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        If the button doesn't work, paste this link into your browser:<br/>
        <a href="${confirmUrl}">${confirmUrl}</a>
      </p>
      <p style="color: #888; font-size: 13px;">
        If you didn't sign up for Cloud PerfumeBD, you can ignore this email.
      </p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [email],
      subject: "Confirm your Cloud PerfumeBD account",
      html,
    }),
  });

  if (!resendResponse.ok) {
    const resendText = await resendResponse.text();
    console.error("send-email-hook: Resend error", resendResponse.status, resendText);
    return new Response(JSON.stringify({ error: "failed to send email" }), { status: 502 });
  }

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
});
