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

          {/* Footer */}
          <footer className="mt-16 border-t border-white/20 py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Perfume Share. All rights reserved.
              </p>
              <nav className="flex gap-6 text-sm">
                <Link href="/perfumes">Explore</Link>
                <Link href="/dashboard/listings">Sell</Link>
                <Link href="/dashboard/profile">Profile</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

