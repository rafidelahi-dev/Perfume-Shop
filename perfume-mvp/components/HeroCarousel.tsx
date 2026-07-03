"use client";

import { useEffect, useState } from "react";

const backgroundImages = [
  "/Background/8.webp",
  "/Background/9.webp",
  "/Background/10.webp",
  "/Background/11.webp",
  "/Background/12.webp",
  "/Background/13.webp",
  "/Background/14.webp",
  "/Background/15.webp",
  "/Background/16.webp",
  "/Background/17.webp",
  "/Background/18.webp",
  "/Background/19.webp",
  "/Background/20.webp",
  "/Background/21.webp",
  "/Background/22.webp",
];

export default function HeroCarousel() {
  const [currentBg, setCurrentBg] = useState(0);
  // Progressive loading: only mount slides we've reached (plus one ahead as
  // preload), instead of fetching all 15 backgrounds on first paint.
  const [maxMounted, setMaxMounted] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => {
        const next = (prev + 1) % backgroundImages.length;
        setMaxMounted((m) => Math.max(m, Math.min(next + 1, backgroundImages.length - 1)));
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {backgroundImages.map((bg, index) => {
        if (index > maxMounted) return null;
        return (
          <div
            key={bg}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1500ms] ease-in-out ${
              index === currentBg ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url('${bg}')` }}
          />
        );
      })}
      {/* Enhanced Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f7f3]/60 via-[#f8f7f3]/40 to-[#f8f7f3]" />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
    </div>
  );
}
