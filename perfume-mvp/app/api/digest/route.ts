import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { unsubToken } from "@/lib/digestToken";
import { timeAgo } from "@/lib/listingUtils";

// Weekly digest. Called by pg_cron (via pg_net) with `Authorization: Bearer $CRON_SECRET`.
export const dynamic = "force-dynamic";

const SITE = "https://www.cloudperfumebd.com";
const FROM = "Cloud PerfumeBD <no-reply@cloudperfumebd.com>";

type Hit = {
  id: string;
  brand: string | null;
  perfume_name: string | null;
  type: string | null;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
};

const HIT_SELECT = "id, brand, perfume_name, type, created_at, profiles:profiles!inner(username)";
const clean = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const later = (a: string, b?: string | null) => (b && b > a ? b : a);
const userOf = (h: Hit) => (Array.isArray(h.profiles) ? h.profiles[0]?.username : h.profiles?.username);

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const db = createAdminClient();

  const [{ data: alerts }, { data: follows }] = await Promise.all([
    db.from("perfume_alerts").select("user_id, query, last_seen_at"),
    db.from("seller_follows").select("follower_id, seller_id, last_seen_at, profiles:profiles!seller_follows_seller_id_fkey(username, display_name)"),
  ]);

  const userIds = [...new Set([...(alerts ?? []).map((a) => a.user_id), ...(follows ?? []).map((f) => f.follower_id)])];
  if (userIds.length === 0) return NextResponse.json({ sent: 0, users: 0 });

  const { data: users } = await db
    .from("profiles")
    .select("id, email, display_name, username, last_digest_at, digest_opt_out")
    .in("id", userIds);

  let sent = 0;
  for (const u of users ?? []) {
    if (!u.email || u.digest_opt_out) continue;

    const sections: { title: string; hits: Hit[] }[] = [];

    for (const a of (alerts ?? []).filter((x) => x.user_id === u.id)) {
      const q = clean(a.query);
      if (!q) continue;
      const { data } = await db
        .from("listings")
        .select(HIT_SELECT)
        .eq("is_hidden", false)
        .eq("status", "available")
        .gt("created_at", later(a.last_seen_at, u.last_digest_at))
        .or(`perfume_name.ilike.%${q}%,brand.ilike.%${q}%,sub_brand.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data?.length) sections.push({ title: `New for your alert “${a.query}”`, hits: data as unknown as Hit[] });
    }

    for (const f of (follows ?? []).filter((x) => x.follower_id === u.id)) {
      const { data } = await db
        .from("listings")
        .select(HIT_SELECT)
        .eq("user_id", f.seller_id)
        .eq("is_hidden", false)
        .eq("status", "available")
        .gt("created_at", later(f.last_seen_at, u.last_digest_at))
        .order("created_at", { ascending: false })
        .limit(5);
      const sp = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
      if (data?.length) {
        sections.push({ title: `New from ${sp?.display_name ?? sp?.username ?? "a seller you follow"}`, hits: data as unknown as Hit[] });
      }
    }

    if (sections.length === 0) continue;

    const unsub = `${SITE}/api/digest/unsubscribe?u=${u.id}&t=${unsubToken(u.id)}`;
    const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1a1a1a">
<h2 style="margin-bottom:4px">New sell posts for you</h2>
<p style="color:#666;margin-top:0">Your weekly update from Cloud PerfumeBD.</p>
${sections
  .map(
    (s) => `<h3 style="margin:24px 0 8px">${esc(s.title)}</h3><ul style="padding-left:18px">${s.hits
      .map(
        (h) =>
          `<li style="margin:6px 0"><a href="${SITE}/perfumes/${userOf(h)}/${h.id}" style="color:#8a6d00">${esc(`${h.brand ?? ""} ${h.perfume_name ?? ""}`.trim())}</a> <span style="color:#888">${esc(h.type ?? "")} · ${esc(timeAgo(h.created_at) ?? "")}</span></li>`
      )
      .join("")}</ul>`
  )
  .join("")}
<p style="margin-top:28px"><a href="${SITE}/dashboard/alerts" style="color:#8a6d00">Open your alerts</a></p>
<p style="font-size:12px;color:#999;margin-top:32px">You get this because you set an alert or follow a seller. <a href="${unsub}" style="color:#999">Unsubscribe</a></p>
</div>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to: [u.email],
      subject: "New sell posts matching your alerts",
      html,
      headers: { "List-Unsubscribe": `<${unsub}>` },
    });
    if (error) {
      console.error("digest send failed", u.id, error);
      continue;
    }
    await db.from("profiles").update({ last_digest_at: new Date().toISOString() }).eq("id", u.id);
    sent++;
  }

  return NextResponse.json({ sent, users: userIds.length });
}
