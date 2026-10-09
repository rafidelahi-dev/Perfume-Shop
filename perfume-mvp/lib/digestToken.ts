import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const secret = () => process.env.CRON_SECRET ?? "";

export function unsubToken(userId: string) {
  return createHmac("sha256", secret()).update(`unsub:${userId}`).digest("hex");
}

export function verifyUnsubToken(userId: string, token: string) {
  if (!secret()) return false;
  const a = Buffer.from(unsubToken(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
