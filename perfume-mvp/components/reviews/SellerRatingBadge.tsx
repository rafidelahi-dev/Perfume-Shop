import { Star } from "lucide-react";

/** Server-safe: "★ 4.5 (3)" next to a seller name. Renders nothing without ratings. */
export default function SellerRatingBadge({
  avg,
  count,
}: {
  avg: number | null;
  count: number;
}) {
  if (!count || avg == null) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600"
      title={`${avg.toFixed(1)} from ${count} seller rating${count > 1 ? "s" : ""}`}
    >
      <Star size={12} className="fill-[#d4af37] text-[#d4af37]" />
      {avg.toFixed(1)}
      <span className="font-normal text-gray-400">({count})</span>
    </span>
  );
}
