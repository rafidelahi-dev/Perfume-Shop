import { Facebook, Globe, MessageSquare, Phone, Star, User } from "lucide-react";
import ShareProfileButton from "./ShareProfileButton";
import { tierLabel, type SellerPass } from "@/lib/sellerPass";

export type PassContact = {
  whatsapp: string | null;
  messenger: string | null;
  facebook: string | null;
  phone: string | null;
  website: string | null;
};

const btn =
  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-white transition";

// Only http(s) links are rendered, anything else (javascript:, data:) is dropped.
function safeUrl(url: string | null): string | null {
  if (!url) return null;
  const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? p.href : null;
  } catch {
    return null;
  }
}

export default function SellerPassHeader({ pass, contact }: { pass: SellerPass; contact: PassContact }) {
  const website = safeUrl(contact.website);
  const hasContact = !!(contact.whatsapp || contact.messenger || contact.facebook || contact.phone || website);
  const name = pass.displayName;

  const stats = [
    pass.ratingAvg != null && pass.ratingCount > 0
      ? { value: `${pass.ratingAvg.toFixed(1)}★`, label: `${pass.ratingCount} review${pass.ratingCount > 1 ? "s" : ""}` }
      : { value: "New", label: "No reviews yet" },
    { value: String(pass.listingCount), label: "Fragrances" },
    { value: String(pass.memberSince), label: "Member since" },
  ];

  return (
    <div className="mb-8">
      <div className="rounded-3xl border border-[#d4af37]/50 bg-[radial-gradient(circle_at_20%_10%,#2a2412_0%,#15130d_60%,#0b0b0b_100%)] p-5 text-white shadow-md md:p-8">
        <div className="flex items-center gap-4">
          {pass.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pass.avatarUrl} alt={name} className="h-20 w-20 rounded-full border-2 border-[#d4af37] object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#2a2412]">
              <User className="h-8 w-8 text-[#d4af37]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-serif text-2xl font-medium md:text-3xl">{name}</h1>
            <p className="mt-0.5 text-sm text-[#d4af37]">{tierLabel(pass.tier, pass.isEarly)}</p>
            <p className="text-xs text-gray-400">@{pass.username}</p>
          </div>
        </div>

        {(pass.verified || pass.foundingNumber != null) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {pass.foundingNumber != null && (
              <span className="rounded-full border border-[#d4af37]/50 px-3 py-1 text-xs tracking-wider text-[#e9dba5]">
                FOUNDING #{String(pass.foundingNumber).padStart(3, "0")}
              </span>
            )}
            {pass.verified && (
              <span className="rounded-full border border-[#d4af37]/50 px-3 py-1 text-xs tracking-wider text-[#e9dba5]">
                VERIFIED PHONE
              </span>
            )}
          </div>
        )}

        {pass.bio && <p className="mt-4 text-sm text-gray-300">{pass.bio}</p>}

        <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-xl font-semibold">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {!hasContact && (
          <div className="rounded-xl border border-yellow-300 bg-white px-4 py-3 text-xs text-yellow-800 shadow-sm md:text-sm">
            <span className="font-semibold">⚠️ Seller Note:</span> This seller hasn’t shared contact details. Proceed with caution and verify transactions carefully.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <ShareProfileButton name={name} username={pass.username} />
          {contact.whatsapp && (
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className={`${btn} bg-[#34A853] hover:bg-[#2d9146]`}>
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {contact.messenger && (
            <a href={contact.messenger} target="_blank" rel="noreferrer" className={`${btn} bg-[#0078FF] hover:bg-[#0063d3]`}>
              <MessageSquare className="h-4 w-4" />
              Messenger
            </a>
          )}
          {contact.facebook && (
            <a href={contact.facebook} target="_blank" rel="noreferrer" className={`${btn} bg-[#1877F2] hover:bg-[#156cdb]`}>
              <Facebook className="h-4 w-4" />
              Facebook
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className={`${btn} bg-[#1a1a1a] hover:bg-black`}>
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noreferrer" className={`${btn} bg-[#6b5a1e] hover:bg-[#574818]`}>
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
          <a href="#reviews" className={`${btn} border border-[#d4af37] !text-[#8a6d12] hover:bg-[#d4af37]/10`}>
            <Star className="h-4 w-4" />
            Rate
          </a>
        </div>
      </div>
    </div>
  );
}
