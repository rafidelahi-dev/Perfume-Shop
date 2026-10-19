"use client";

import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import type { MyReview } from "@/lib/queries/reviews";

type Props = {
  items: MyReview[];
  isLoading: boolean;
  error: Error | null;
  onDelete: (id: string) => void;
};

export default function ReviewList({ items, isLoading, error, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a1a1a] mb-4" />
        <p className="text-gray-600 font-medium">Loading your reviews…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">Failed to load reviews. Please refresh.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <p className="text-gray-500 text-sm">
          No reviews yet. Open any fragrance page and tap the stars to leave your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((r) => (
        <div
          key={r.id}
          className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow"
        >
          {r.images[0] && (
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.images[0]}
                alt={r.perfumes?.name ?? "Review photo"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {r.is_flagged && (
              <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Flagged by moderators{r.flag_reason ? `: ${r.flag_reason}` : "."}
              </div>
            )}
            {r.is_hidden && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Hidden by moderators. Only you can see this.
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {r.perfumes ? (
                  <Link
                    href={`/fragrance/${r.perfumes.slug}`}
                    className="font-semibold text-gray-900 text-sm truncate block hover:underline"
                  >
                    {r.perfumes.name}
                  </Link>
                ) : (
                  <p className="font-semibold text-gray-900 text-sm">Fragrance</p>
                )}
                <p className="text-xs text-gray-500">{r.perfumes?.brand}</p>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mt-2 flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={14}
                  className={n <= r.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-gray-300"}
                />
              ))}
              {r.is_anonymous && <span className="ml-2 text-xs text-gray-400">Posted anonymously</span>}
            </div>

            {r.review_text && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">{r.review_text}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
