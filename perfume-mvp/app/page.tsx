"use client";

// app/page.tsx
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [currentBg, setCurrentBg] = useState(0);

   // Array of background images with different color variations
  const backgroundImages = [
    "/Background/1.png", 
    "/Background/2.png", 
    "/Background/6.png",
    "/Background/3.png", 
    "/Background/4.png", 
    "/Background/5.png", 
     
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 3000)
    return () => clearInterval(interval);
  }, [])


  return (
    <>
    <Header/>
      {/* Enhanced Hero Section with Background */}
      <section className="relative w-full overflow-hidden rounded-none min-h-[85vh] flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          {backgroundImages.map((bg, index) => (
            <div
              key={bg}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
                index === currentBg ? "opacity-100" : "opacity-0"
              }`}
              style={{
                backgroundImage: `url('${bg}')`,
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8f7f3]/50 via-[#f3f1ec]/5 to-[#e8e5dd]/40" />
  
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-br from-[#d4af37]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tr from-[#c9b7a7]/10 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl text-center px-6 sm:px-12">

          <h1 className="text-5xl font-light tracking-tight text-[#111] sm:text-6xl lg:text-7xl mb-6">
            Discover Your
            <span className="block mt-2 font-serif italic text-[#d4af37]">Signature Scent</span>
          </h1>
          
          <p className="mt-6 text-xl text-[#444] max-w-2xl mx-auto leading-relaxed font-light">
            Curate, decant, and share exceptional fragrances from the world's most discerning perfume collectors.
          </p>
          
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link 
              href="/perfumes" 
              className="btn btn-primary text-base px-8 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Explore Collection
            </Link>
            <Link 
              href="/dashboard/listings" 
              className="btn btn-outline text-base px-8 py-4 border-2 hover:bg-white/50"
            >
              Become a Seller
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-[#666]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#d4af37] rounded-full" />
              <span>100% Authentic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#d4af37] rounded-full" />
              <span>Global Community</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#d4af37] rounded-full" />
              <span>Secure Transactions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Now - Enhanced */}
      <section className="py-20 px-6 sm:px-12 bg-gradient-to-b from-white/50 to-[#f8f7f3]">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl font-light text-[#111] mb-4">Trending Now</h2>
              <p className="text-[#666] font-light">
                Discover what the community is loving this season
              </p>
            </div>
            <Link 
              href="/perfumes" 
              className="text-sm text-[#666] hover:text-[#111] border-b border-transparent hover:border-[#111] transition-all pb-1"
            >
              View all collections
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: "Dior Sauvage", 
                brand: "Christian Dior",
                price: 32, 
                size: "10ml decant",
                notes: ["Bergamot", "Ambroxan", "Pepper"],
                image: "bg-gradient-to-br from-blue-50 to-blue-100"
              },
              { 
                title: "Creed Aventus", 
                brand: "Creed",
                price: 58, 
                size: "10ml decant",
                notes: ["Pineapple", "Birch", "Musk"],
                image: "bg-gradient-to-br from-amber-50 to-amber-100"
              },
              { 
                title: "Bleu de Chanel", 
                brand: "Chanel",
                price: 36, 
                size: "5ml decant",
                notes: ["Grapefruit", "Ginger", "Sandalwood"],
                image: "bg-gradient-to-br from-gray-50 to-gray-100"
              },
            ].map((perfume) => (
              <div 
                key={perfume.title} 
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                {/* Product Image */}
                <div className={`relative h-64 ${perfume.image} flex items-center justify-center`}>
                  {/* Mock Perfume Bottle */}
                  <div className="w-16 h-32 bg-gradient-to-b from-white to-gray-200 rounded-lg shadow-lg border border-white/50 relative">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-24 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm" />
                  </div>
                  
                  {/* Favorite Button */}
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110">
                    <span className="text-lg">♥</span>
                  </button>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-lg text-[#111]">{perfume.title}</h3>
                      <p className="text-sm text-[#666] font-light">{perfume.brand}</p>
                    </div>
                    <span className="rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white">
                      ${perfume.price}
                    </span>
                  </div>

                  <p className="text-xs text-[#666] mb-4 font-light">{perfume.size}</p>

                  {/* Fragrance Notes */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {perfume.notes.map((note) => (
                      <span 
                        key={note}
                        className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full text-xs text-[#666] border border-white/30"
                      >
                        {note}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 rounded-xl border border-[#1a1a1a] px-4 py-3 text-sm font-medium hover:bg-[#eae8e1] transition-all">
                      Details
                    </button>
                    <button className="flex-1 rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-all">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 sm:px-12 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-light mb-6">Ready to Find Your Signature Scent?</h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
            Join thousands of fragrance enthusiasts discovering, sharing, and trading exclusive perfumes from around the world.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link 
              href="/signup" 
              className="rounded-full bg-[#d4af37] px-8 py-4 text-sm font-medium text-[#1a1a1a] hover:bg-[#b8941f] transition-all transform hover:-translate-y-1"
            >
              Start Your Journey
            </Link>
            <Link 
              href="/about" 
              className="rounded-full border border-white/30 px-8 py-4 text-sm font-medium text-white hover:bg-white/10 transition-all"
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