"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { RATING_LABELS } from "@/lib/polls";

type Props = {
  value: number | null;
  onRate: (n: number) => void;
  disabled?: boolean;
};

export default function StarRater({ value, onRate, disabled }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}: ${RATING_LABELS[n]}`}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onClick={() => onRate(n)}
            className="p-1 transition-transform hover:scale-110 disabled:opacity-60"
          >
            <Star
              size={32}
              className={n <= shown ? "fill-[#d4af37] text-[#d4af37]" : "text-gray-300"}
            />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-sm text-gray-500">{RATING_LABELS[shown]}</span>}
    </div>
  );
}
