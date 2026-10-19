"use client";

import { Flag, Star } from "lucide-react";
import type { PublicReview } from "@/lib/queries/perfumes";

type Props = {
  reviews: PublicReview[];
  /** Present only when logged in. */
  onReport?: (reviewId: string) => void;
};

export default function ReviewList({ reviews, onReport }: Props) {
  if (reviews.length === 0) {
    return <p className="text-sm text-gray-400">No reviews yet.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {reviews.map((r) => (
        <li key={r.id} className="py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{r.display_name}</span>
            <span className="flex" aria-label={`${r.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={14}
                  className={n <= r.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-gray-300"}
                />
              ))}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(r.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {onReport && (
              <button
                type="button"
                onClick={() => onReport(r.id)}
                aria-label="Report review"
                className="ml-auto text-gray-300 hover:text-red-500"
              >
                <Flag size={14} />
              </button>
            )}
          </div>
          {(r.owns_bottle || r.knows_seller) && (
            <div className="mt-1 flex gap-2">
              {r.owns_bottle && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  Says they own this
                </span>
              )}
              {r.knows_seller && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                  Knows the seller
                </span>
              )}
            </div>
          )}
          {r.review_text && (
            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{r.review_text}</p>
          )}
          {r.images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {r.images.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
