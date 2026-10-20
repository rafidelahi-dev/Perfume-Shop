"use client";

import { BadgeCheck, Flag, Handshake, MessageSquarePlus, Star } from "lucide-react";
import type { PublicReview } from "@/lib/queries/perfumes";

type Props = {
  reviews: PublicReview[];
  /** Present only when logged in. */
  onReport?: (reviewId: string) => void;
  /** Empty state action: nudges the first review. */
  onFirst?: () => void;
};

const HUES = ["#8b5cf6", "#f59e0b", "#ec4899", "#10b981", "#0ea5e9", "#f97316"];

function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export default function ReviewList({ reviews, onReport, onFirst }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 px-6 py-10 text-center">
        <MessageSquarePlus size={28} className="text-[#d4af37]" aria-hidden />
        <p className="font-serif text-lg font-semibold text-[#1a1a1a]">No reviews yet</p>
        <p className="max-w-xs text-sm text-gray-600">
          Your words could be the first thing the next buyer reads.
        </p>
        {onFirst && (
          <button
            type="button"
            onClick={onFirst}
            className="min-h-[44px] rounded-full bg-[#1a1a1a] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
          >
            Write the first review
          </button>
        )}
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => {
        const hue = hueFor(r.display_name);
        return (
          <li
            key={r.id}
            className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.12)] sm:p-5"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ background: hue }}
                aria-hidden
              >
                {r.display_name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{r.display_name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="flex" aria-label={`${r.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={16}
                    className={n <= r.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-gray-300"}
                  />
                ))}
              </span>
              {onReport && (
                <button
                  type="button"
                  onClick={() => onReport(r.id)}
                  aria-label="Report review"
                  className="grid h-10 w-10 place-items-center text-gray-300 hover:text-red-500"
                >
                  <Flag size={14} />
                </button>
              )}
            </div>
            {(r.owns_bottle || r.knows_seller) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.owns_bottle && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    <BadgeCheck size={13} aria-hidden /> Says they own this
                  </span>
                )}
                {r.knows_seller && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    <Handshake size={13} aria-hidden /> Knows the seller
                  </span>
                )}
              </div>
            )}
            {r.review_text && (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">
                {r.review_text}
              </p>
            )}
            {r.images.length > 0 && (
              <div className="mt-3 flex gap-2">
                {r.images.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
