import { NextRequest, NextResponse } from "next/server";
import { sendMetaCapiEvent } from "@/lib/metaCapi";

export async function POST(req: NextRequest) {
  const { eventId, email, phone, sourceUrl } = await req.json();

  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
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
