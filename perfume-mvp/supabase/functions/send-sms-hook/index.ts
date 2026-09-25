import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

// Standard Webhooks secret Supabase generates when you add this function
// as the Send SMS hook (Authentication -> Hooks -> Send SMS).
const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET")?.replace("v1,whsec_", "");

const apiKey = Deno.env.get("BULKSMSBD_API_KEY");
const senderId = Deno.env.get("BULKSMSBD_SENDER_ID") || "Random";

type SendSmsPayload = {
  user: { phone?: string };
  sms: { otp?: string };
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  if (!hookSecret) {
    console.error("SEND_SMS_HOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "hook not configured" }), { status: 500 });
  }

  if (!apiKey) {
    console.error("BULKSMSBD_API_KEY not set");
    return new Response(JSON.stringify({ error: "sms gateway not configured" }), { status: 500 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: SendSmsPayload;
  try {
    const wh = new Webhook(hookSecret);
    data = wh.verify(payload, headers) as SendSmsPayload;
  } catch (err) {
    console.error("send-sms-hook: signature verification failed", err);
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
  }

  const phone = data.user?.phone;
  const otp = data.sms?.otp;

  if (!phone || !otp) {
    console.error("send-sms-hook: missing phone or otp in payload");
    return new Response(JSON.stringify({ error: "malformed payload" }), { status: 400 });
  }

  const smsBody = `Your Cloud PerfumeBd verification code is ${otp}. It will expire in 1 minute.`;

  const bodyParams = new URLSearchParams({
    api_key: apiKey,
    senderid: senderId,
    number: phone.startsWith("+") ? phone : `+${phone}`,
    message: smsBody,
  });

  const smsResponse = await fetch("https://bulksmsbd.net/api/smsapi", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParams.toString(),
  });

  if (!smsResponse.ok) {
    const smsText = await smsResponse.text();
    console.error("send-sms-hook: BulkSMSBD error", smsResponse.status, smsText);
    return new Response(JSON.stringify({ error: "failed to send SMS" }), { status: 502 });
  }

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
  });
});
