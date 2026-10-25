import { NextRequest, NextResponse } from "next/server";
import { sendMetaCapiEvent } from "@/lib/metaCapi";
import { rateLimit, clientIp as ipOf, tooManyRequests } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Fired right after signup, before a server-readable session exists, so this
  // can't require login. Cap volume and input shape instead.
  if (!rateLimit(`capi:${ipOf(req)}`, 5, 60 * 60 * 1000)) return tooManyRequests();

  const body = await req.json().catch(() => null);
  const { eventId, email, phone, sourceUrl } = body ?? {};

  if (typeof eventId !== "string" || eventId.length < 8 || eventId.length > 64) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }
  if ((email != null && typeof email !== "string") || (phone != null && typeof phone !== "string")) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await sendMetaCapiEvent({
    eventName: "CompleteRegistration",
    eventId,
    eventSourceUrl: typeof sourceUrl === "string" ? sourceUrl : req.nextUrl.origin,
    userData: { email, phone, clientIp, userAgent },
  });

  return NextResponse.json({ ok: true });
}
