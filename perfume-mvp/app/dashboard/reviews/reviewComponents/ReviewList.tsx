"use client";

import { Trash2 } from "lucide-react";
import type { Review } from "@/lib/queries/reviews";

const RATING_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  love:    { emoji: "❤️",  label: "Love",    color: "text-red-600" },
  like:    { emoji: "👍",  label: "Like",    color: "text-green-600" },
  okay:    { emoji: "😐",  label: "Okay",    color: "text-yellow-600" },
  dislike: { emoji: "👎",  label: "Dislike", color: "text-orange-600" },
  hate:    { emoji: "💀",  label: "Hate",    color: "text-gray-600" },
};

const GENDER_LABEL: Record<string, string> = {
  very_masculine: "Very Masculine",
  masculine:      "Masculine",
  unisex:         "Unisex",
  feminine:       "Feminine",
  very_feminine:  "Very Feminine",
};

type Props = {
  items: Review[];
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
        <p className="text-gray-500 text-sm">No reviews yet. Add your first one above.</p>
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
          {/* Image */}
          {r.images[0] && (
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.images[0]}
                alt={r.perfume_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Name + Brand */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{r.perfume_name}</p>
                <p className="text-xs text-gray-500">{r.brand}</p>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Category */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                {r.category}
              </span>
              {r.sub_category && (
                <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded-md px-2 py-0.5">
                  {r.sub_category}
                </span>
              )}
            </div>

            {/* Meta chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.rating && (
                <span className={`text-xs font-medium ${RATING_DISPLAY[r.rating]?.color}`}>
                  {RATING_DISPLAY[r.rating]?.emoji} {RATING_DISPLAY[r.rating]?.label}
                </span>
              )}
              {r.longevity && (
                <span className="text-xs bg-blue-50 text-blue-700 rounded-md px-2 py-0.5">
                  {r.longevity}
                </span>
              )}
              {r.gender && (
                <span className="text-xs bg-purple-50 text-purple-700 rounded-md px-2 py-0.5">
                  {GENDER_LABEL[r.gender]}
                </span>
              )}
            </div>

            {/* When to wear */}
            {r.when_to_wear.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.when_to_wear.map((w) => (
                  <span
                    key={w}
                    className="text-xs bg-amber-50 text-amber-700 rounded-md px-2 py-0.5 capitalize"
                  >
                    {w}
                  </span>
                ))}
              </div>
            )}

            {/* Review text */}
            {r.review_text && (
              <p className="mt-2 text-xs text-gray-600 line-clamp-2">{r.review_text}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
