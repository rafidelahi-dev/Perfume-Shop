"use client";

import { useEffect, useState } from "react";

const backgroundImages = [
  "/Background/8.png",
  "/Background/9.png",
  "/Background/10.png",
  "/Background/11.png",
  "/Background/12.png",
  "/Background/13.png",
  "/Background/14.png",
  "/Background/15.png",
  "/Background/16.png",
  "/Background/17.png",
  "/Background/18.png",
  "/Background/19.png",
  "/Background/20.png",
  "/Background/21.png",
  "/Background/22.png",
];

export default function HeroCarousel() {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {backgroundImages.map((bg, index) => (
        <div
          key={bg}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-in-out ${
            index === currentBg ? "opacity-100 scale-105" : "opacity-0 scale-100"
          }`}
          style={{ backgroundImage: `url('${bg}')` }}
        />
      ))}
      {/* Enhanced Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f7f3]/60 via-[#f8f7f3]/40 to-[#f8f7f3]" />
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
    </div>
  );
}
