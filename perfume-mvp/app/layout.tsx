// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Perfume Share",
  description: "Discover, decant & deal — the modern fragrance marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">
        {/* Background */}
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8f7f3] via-[#f3f1ec] to-[#e8e5dd]" />
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#d4af37]/20 via-[#c9b7a7]/20 to-transparent blur-3xl" />
        </div>


        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

