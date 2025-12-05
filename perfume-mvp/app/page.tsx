"use client";

// app/page.tsx
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Link from "next/link";
import TrendingSection from "@/components/TrendingSection";

const backgroundImages = [
  "/Background/1.png",
  "/Background/2.png",
  "/Background/6.png",
  "/Background/3.png",
  "/Background/4.png",
  "/Background/5.png",
];

export default function Home() {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length);
    }, 4000); // Slowed down slightly for a more relaxed luxury feel

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header />
      
      {/* Enhanced Hero Section */}
      <section className="relative w-full overflow-hidden min-h-[90vh] flex items-center justify-center pb-10 pt-20">
        
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          {backgroundImages.map((bg, index) => (
            <div
              key={bg}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-in-out ${
                index === currentBg ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
              style={{
                backgroundImage: `url('${bg}')`,
              }}
            />
          ))}
          {/* Enhanced Gradient Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f7f3]/80 via-[#f8f7f3]/60 to-[#f8f7f3]" />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl text-center px-6 sm:px-12 flex flex-col items-center">
          
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 backdrop-blur-md">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#8a7224]">The New Standard</span>
          </div>

          <h1 className="text-5xl font-light tracking-tight text-[#111] sm:text-7xl lg:text-8xl mb-8">
            Discover Your
            <span className="block mt-2 font-serif italic text-[#d4af37] drop-shadow-sm">Signature Scent</span>
          </h1>
          
          <p className="mt-2 text-lg sm:text-xl text-[#555] max-w-2xl mx-auto leading-relaxed font-light">
            {"Curate, decant, and share exceptional fragrances from the world's most discerning perfume collectors."}
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/perfumes" 
              className="btn bg-[#1a1a1a] text-white hover:bg-black border-none text-base px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              Explore Collection
            </Link>
            <Link 
              href="/dashboard/listings" 
              className="btn bg-white/50 backdrop-blur-md border border-[#1a1a1a]/10 text-[#1a1a1a] hover:bg-white text-base px-10 py-4 rounded-full shadow-sm hover:shadow-md transition-all duration-300"
            >
              Become a Seller
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-20 pt-8 border-t border-black/5 grid grid-cols-3 gap-8 sm:gap-16 text-xs sm:text-sm font-medium tracking-wide text-[#666] uppercase">
            <div className="flex flex-col items-center gap-2">
               <span className="text-[#d4af37] text-lg">✦</span>
               <span>100% Authentic</span>
            </div>
            <div className="flex flex-col items-center gap-2">
               <span className="text-[#d4af37] text-lg">✦</span>
               <span>Global Community</span>
            </div>
            <div className="flex flex-col items-center gap-2">
               <span className="text-[#d4af37] text-lg">✦</span>
               <span>Secure Deals</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <TrendingSection/>

      {/* CTA Section */}
      <section className="relative py-24 px-6 sm:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-[#1a1a1a]">
            {/* Abstract shapes in background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-5xl font-light mb-6 text-white">Ready to Find Your Scent?</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-10 font-light text-lg leading-relaxed">
            Join thousands of fragrance enthusiasts discovering, sharing, and trading exclusive perfumes from around the world.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link 
              href="/signup" 
              className="rounded-full bg-[#d4af37] px-10 py-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#c4a030] transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Start Your Journey
            </Link>
            <Link 
              href="/about" 
              className="rounded-full border border-white/20 bg-white/5 px-10 py-4 text-sm font-medium text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}