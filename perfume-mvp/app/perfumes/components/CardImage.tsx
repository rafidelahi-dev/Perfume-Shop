"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const CYCLE_MS = 1200;
const SWIPE_PX = 40;

// Card photo: mouse hover cycles through all images, touch swipes between them.
export default function CardImage({
  images,
  alt,
  sold,
}: {
  images: string[];
  alt: string;
  sold?: boolean;
}) {
  const n = images.length;
  const [idx, setIdx] = useState(0);
  const [active, setActive] = useState(false); // false = render only the first image
  const [hovering, setHovering] = useState(false);
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    if (!hovering || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), CYCLE_MS);
    return () => clearInterval(t);
  }, [hovering, n]);

  if (n === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f2eee4] text-[#aaa] text-sm">
        No Image
      </div>
    );
  }

  const shown = active ? images : images.slice(0, 1);

  return (
    <div
      className="absolute inset-0 touch-pan-y"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        setActive(true);
        setHovering(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        setHovering(false);
        setIdx(0);
      }}
      onTouchStart={(e) => {
        setActive(true);
        touchX.current = e.touches[0].clientX;
        swiped.current = false;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null || n < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < SWIPE_PX) return;
        swiped.current = true;
        setIdx((i) => (dx < 0 ? (i + 1) % n : (i - 1 + n) % n));
      }}
      // A swipe must not count as a tap on the card link.
      onClick={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {shown.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : `${alt} photo ${i + 1}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`object-cover transition-opacity duration-500 ${
            i === idx ? "opacity-100" : "opacity-0"
          } ${sold ? "grayscale" : ""}`}
        />
      ))}
      {n > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"
              } shadow`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
