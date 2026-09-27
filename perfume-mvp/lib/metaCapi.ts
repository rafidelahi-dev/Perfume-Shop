import { createHash } from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;
const GRAPH_API_VERSION = "v21.0";

function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type MetaCapiUserData = {
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
};

export async function sendMetaCapiEvent(params: {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData: MetaCapiUserData;
}): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  const { eventName, eventId, eventSourceUrl, userData } = params;

  const user_data: Record<string, string | string[]> = {};
  if (userData.email) user_data.em = [hash(userData.email)];
  if (userData.phone) user_data.ph = [hash(userData.phone.replace(/[^0-9]/g, ""))];
  if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
  if (userData.userAgent) user_data.client_user_agent = userData.userAgent;

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data,
      },
    ],
  };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Meta CAPI error:", res.status, text);
  }
}
