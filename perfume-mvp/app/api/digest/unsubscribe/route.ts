import { createAdminClient } from "@/lib/supabaseAdmin";
import { verifyUnsubToken } from "@/lib/digestToken";

export const dynamic = "force-dynamic";

const page = (msg: string, status = 200, extra = "") =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digest</title><body style="font-family:Georgia,serif;max-width:480px;margin:20vh auto;padding:0 16px;text-align:center;color:#1a1a1a"><h2>${msg}</h2>${extra}<p><a href="https://www.cloudperfumebd.com" style="color:#8a6d00">Back to Cloud PerfumeBD</a></p></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );

async function unsubscribe(url: URL) {
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!u || !verifyUnsubToken(u, t)) return page("Invalid unsubscribe link.", 400);
  const { error } = await createAdminClient().from("profiles").update({ digest_opt_out: true }).eq("id", u);
  if (error) return page("Something went wrong. Try again later.", 500);
  return page("You are unsubscribed from the weekly email.");
}

// Email scanners prefetch links, so GET only asks for confirmation.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!u || !verifyUnsubToken(u, t)) return page("Invalid unsubscribe link.", 400);
  const form = `<form method="post" action="${url.pathname}?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}"><button style="padding:10px 20px;border:0;border-radius:8px;background:#1a1a1a;color:#fff;font-size:16px;cursor:pointer">Confirm unsubscribe</button></form>`;
  return page("Unsubscribe from the weekly email?", 200, form);
}

// One-click unsubscribe (RFC 8058) posts here.
export async function POST(req: Request) {
  return unsubscribe(new URL(req.url));
}
