"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { RATING_LABELS } from "@/lib/polls";

type Props = {
  value: number | null;
  onRate: (n: number) => void;
  disabled?: boolean;
};

// Mood colour per rating: cool and muted at the low end, gold at the top.
const MOOD: Record<number, string> = {
  1: "#94a3b8",
  2: "#fb923c",
  3: "#facc15",
  4: "#e0b92f",
  5: "#d4af37",
};

export default function StarRater({ value, onRate, disabled }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const color = MOOD[shown] ?? "#d1d5db";

  function pick(n: number) {
    setPopped(n);
    window.setTimeout(() => setPopped(null), 650);
    onRate(n);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= shown;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}: ${RATING_LABELS[n]}`}
              disabled={disabled}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => pick(n)}
              className="relative grid h-12 w-11 place-items-center transition-transform duration-200 hover:-translate-y-0.5 active:scale-90 disabled:opacity-60 sm:w-12"
            >
              {popped === n && (
                <span
                  aria-hidden
                  className="anim-star-ring absolute h-8 w-8 rounded-full border-2"
                  style={{ borderColor: MOOD[n] }}
                />
              )}
              <Star
                size={36}
                strokeWidth={1.75}
                className={popped === n ? "anim-star-pop" : ""}
                style={{
                  fill: on ? color : "transparent",
                  color: on ? color : "#d1d5db",
                  transition: "fill 0.2s, color 0.2s",
                }}
              />
            </button>
          );
        })}
      </div>
      <span
        className="min-h-[1.5rem] font-serif text-lg font-semibold transition-colors"
        style={{ color: shown > 0 ? "#1a1a1a" : "#9ca3af" }}
        aria-live="polite"
      >
        {shown > 0 ? RATING_LABELS[shown] : "Tap a star"}
      </span>
    </div>
  );
}
