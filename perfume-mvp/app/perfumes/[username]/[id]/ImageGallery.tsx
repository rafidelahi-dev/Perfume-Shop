"use client";

import { useState } from "react";

type Props = {
  images: string[];
  perfumeName: string;
};

export default function ImageGallery({ images, perfumeName }: Props) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) return null;

  function prev() {
    setSelected((i) => (i === 0 ? images.length - 1 : i - 1));
  }

  function next() {
    setSelected((i) => (i === images.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[selected]}
          alt={`${perfumeName} — image ${selected + 1}`}
          className="w-full h-[400px] object-cover"
        />

        {/* Prev / Next arrows — only shown when multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-all"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition-all"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            {/* Dot indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === selected ? "bg-white scale-125" : "bg-white/50"
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails — all images, clickable */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`${perfumeName} thumbnail ${i + 1}`}
              onClick={() => setSelected(i)}
              className={`rounded-lg object-cover w-full h-20 cursor-pointer transition-all duration-150 ${
                i === selected
                  ? "ring-2 ring-[#d4af37] opacity-100"
                  : "opacity-70 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
