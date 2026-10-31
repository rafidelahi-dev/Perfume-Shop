import { createClient } from "@supabase/supabase-js";

export type Tier = "silver" | "gold" | "platinum";

export type SellerPass = {
  sellerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  ratingCount: number;
  ratingAvg: number | null;
  tier: Tier | null;
  isEarly: boolean;
  foundingNumber: number | null;
  verified: boolean;
  listingCount: number;
  memberSince: number;
};

type PassRow = {
  seller_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  rating_count: number | string;
  rating_avg: number | string | null;
  tier: Tier | null;
  is_early: boolean;
  founding_number: number | null;
  verified: boolean;
  listing_count: number | string;
  member_since: number;
};

export async function fetchSellerPass(username: string): Promise<SellerPass | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.rpc("get_seller_pass", { p_username: username });
  const row = (data as PassRow[] | null)?.[0];
  if (!row) return null;
  return {
    sellerId: row.seller_id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    ratingCount: Number(row.rating_count),
    ratingAvg: row.rating_avg == null ? null : Number(row.rating_avg),
    tier: row.tier,
    isEarly: row.is_early,
    foundingNumber: row.founding_number,
    verified: row.verified,
    listingCount: Number(row.listing_count),
    memberSince: row.member_since,
  };
}

export function tierLabel(tier: Tier | null, isEarly: boolean): string {
  if (!tier) return "New seller";
  const name = tier[0].toUpperCase() + tier.slice(1);
  return `${isEarly ? "Early " : ""}${name} Seller`;
}

// The card renderer has no Bangla glyphs, so anything outside basic Latin falls back to @username.
export function cardName(displayName: string, username: string): string {
  const name = displayName.trim();
  return name && name.length <= 28 && /^[\x20-\x7E]+$/.test(name) ? name : `@${username}`;
}

export function initialOf(name: string): string {
  return name.match(/[A-Za-z]/)?.[0].toUpperCase() ?? "?";
}

// The card renderer draws WebP/AVIF as blank boxes.
export function isCardSafeImage(url: string | null): boolean {
  return !!url && !/\.(webp|avif)(\?|#|$)/i.test(url);
}
