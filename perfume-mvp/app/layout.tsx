// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Cloud PerfumeBD",
  description: "Discover, decant & deal — the new age fragrance marketplace.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth selection:bg-[#d4af37] selection:text-white">
      <body className="min-h-screen antialiased text-[#1a1a1a]">
        {/* Background Layer */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          {/* Base Cream Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#fdfbf7] via-[#f4f1ea] to-[#e8e6df]" />
          
          {/* Subtle Ambient Orb */}
          <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-gradient-to-b from-[#d4af37]/10 via-transparent to-transparent blur-[100px]" />
          
          {/* Noise Texture Overlay (Optional for 'paper' feel) */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </div>

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}