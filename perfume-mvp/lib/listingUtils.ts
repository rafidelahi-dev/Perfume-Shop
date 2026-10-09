// Small pure helpers shared by listing cards, the feed and the detail page.
import { SITE_URL } from "@/lib/site";

type PriceFields = {
  type?: string | null;
  price?: number | null;
  min_price?: number | null;
};

type DecantOption = { ml: number; price: number };

export function effectivePrice(p: PriceFields): number {
  if ((p.type ?? "").toLowerCase() === "decant" && p.min_price != null) {
    return Number(p.min_price);
  }
  return Number(p.price ?? NaN);
}

export function timeAgo(iso?: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function isPostedWithin(iso: string | null | undefined, hours: number, now = Date.now()) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && now - t <= hours * 3600_000;
}

/** Cheapest per-ml price for decants and partials, null when it can't be computed. */
export function pricePerMl(p: PriceFields & {
  partial_left_ml?: number | null;
  decant_options?: unknown;
}): number | null {
  const type = (p.type ?? "").toLowerCase();
  if (type === "decant" && Array.isArray(p.decant_options)) {
    const rates = (p.decant_options as DecantOption[])
      .filter((o) => o && o.ml > 0 && o.price > 0)
      .map((o) => o.price / o.ml);
    return rates.length ? Math.min(...rates) : null;
  }
  if (type === "partial" && p.partial_left_ml && p.partial_left_ml > 0 && p.price) {
    return Number(p.price) / p.partial_left_ml;
  }
  return null;
}

export function formatTaka(n: number, digits = 0) {
  return `৳${n.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
}

export function listingUrl(username: string | null | undefined, id: string) {
  return `${SITE_URL}/perfumes/${username ?? "seller"}/${id}`;
}

export function typeLabel(type?: string | null) {
  const t = (type ?? "").toLowerCase();
  if (t === "intact") return "Full bottle";
  if (t === "partial") return "Partial";
  if (t === "decant") return "Decant";
  return "Perfume";
}

type PostInput = PriceFields & {
  brand?: string | null;
  sub_brand?: string | null;
  perfume_name?: string | null;
  bottle_size_ml?: number | null;
  partial_left_ml?: number | null;
  decant_options?: unknown;
};

/** Facebook-group style "Sell Post" text that sellers can paste into a group. */
export function buildSellPostText(l: PostInput, url: string): string {
  const name = [l.brand, l.sub_brand, l.perfume_name].filter(Boolean).join(" ");
  const type = (l.type ?? "").toLowerCase();
  const lines: string[] = ["SELL POST", name];

  if (type === "decant" && Array.isArray(l.decant_options) && l.decant_options.length) {
    lines.push("Decant");
    for (const o of [...(l.decant_options as DecantOption[])].sort((a, b) => a.ml - b.ml)) {
      lines.push(`${o.ml}ml - ${formatTaka(o.price)}`);
    }
  } else if (type === "partial") {
    lines.push(`Partial${l.partial_left_ml ? `, ${l.partial_left_ml}ml left` : ""}`);
    const p = effectivePrice(l);
    if (Number.isFinite(p)) lines.push(`Price: ${formatTaka(p)}`);
  } else {
    lines.push(`Full bottle${l.bottle_size_ml ? `, ${l.bottle_size_ml}ml` : ""}`);
    const p = effectivePrice(l);
    if (Number.isFinite(p)) lines.push(`Price: ${formatTaka(p)}`);
  }

  lines.push("", `Photos and details: ${url}`);
  return lines.join("\n");
}
