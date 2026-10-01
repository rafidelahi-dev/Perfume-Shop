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

// Registering this hook makes it the ONLY sender for every auth email type —
// Supabase does NOT fall back to its default sender for types this hook
// skips. Each handled type needs its own branch here or it silently sends
// nothing (this is what broke password-reset emails: the hook short-circuited
// on actionType !== "signup" and reported success without calling Resend).
const EMAIL_COPY: Record<string, { verifyType: string; subject: string; heading: string; body: string; cta: string }> = {
  signup: {
    verifyType: "signup",
    subject: "Confirm your Cloud PerfumeBD account",
    heading: "Confirm your Cloud PerfumeBD account",
    body: "Tap the button below to confirm your email and activate your account.",
    cta: "Confirm my email",
  },
  recovery: {
    verifyType: "recovery",
    subject: "Reset your Cloud PerfumeBD password",
    heading: "Reset your password",
    body: "Tap the button below to choose a new password for your Cloud PerfumeBD account. If you didn't request this, you can ignore this email.",
    cta: "Reset my password",
  },
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
  const actionType = data.email_data?.email_action_type ?? "";

  // Magic link and email-change emails aren't handled here — keep returning
  // success-with-no-op for those (unchanged behavior, not in scope).
  const copy = EMAIL_COPY[actionType];
  if (!copy) {
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

  // Recovery links point at our own app instead of straight at Supabase's
  // /auth/v1/verify: email link-scanners (Outlook Safe Links, antivirus
  // gateways) GET every link in a message to prescan it, which silently
  // consumes a single-use OTP token before the human clicks. Our app page
  // only calls verifyOtp() from client JS, which scanners don't execute.
  let confirmUrl: string;
  if (actionType === "recovery") {
    let appOrigin = "https://www.cloudperfumebd.com";
    try {
      if (redirectTo) appOrigin = new URL(redirectTo).origin;
    } catch {
      // keep fallback
    }
    confirmUrl = `${appOrigin}/reset/confirm?token_hash=${tokenHash}&type=recovery`;
  } else {
    confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=${copy.verifyType}&redirect_to=${encodeURIComponent(redirectTo || siteUrl || "")}`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 20px; color: #111;">${copy.heading}</h1>
      <p style="color: #444; line-height: 1.5;">
        ${copy.body}
      </p>
      <p style="margin: 28px 0;">
        <a href="${confirmUrl}"
           style="background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          ${copy.cta}
        </a>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        If the button doesn't work, paste this link into your browser:<br/>
        <a href="${confirmUrl}">${confirmUrl}</a>
      </p>
      <p style="color: #888; font-size: 13px;">
        If you didn't request this, you can ignore this email.
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
      subject: copy.subject,
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
