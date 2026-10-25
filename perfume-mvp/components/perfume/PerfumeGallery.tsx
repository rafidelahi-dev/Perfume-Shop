"use client";

import Image from "next/image";
import { useState } from "react";

type Props = { images: string[]; name: string };

export default function PerfumeGallery({ images, name }: Props) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div>
      <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-black/5 bg-white">
        <Image
          src={images[active]}
          alt={`${name} bottle photo ${active + 1}`}
          fill
          priority={active === 0}
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-contain p-4"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border bg-white ${
                  i === active ? "border-[#d4af37]" : "border-black/10"
                }`}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
