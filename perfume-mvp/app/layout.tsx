// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

const SITE_URL = "https://www.cloudperfumebd.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cloud PerfumeBD — Bangladesh's Fragrance Marketplace",
    template: "%s | Cloud PerfumeBD",
  },
  description:
    "Discover, decant & deal — Bangladesh's community-powered marketplace for genuine perfumes. Buy and sell full bottles, partials, and decants.",
  keywords: [
    "perfume Bangladesh",
    "fragrance marketplace",
    "decant perfume",
    "buy perfume online Bangladesh",
    "sell perfume Bangladesh",
    "cloud perfumebd",
    "authentic perfume",
  ],
  authors: [{ name: "Cloud PerfumeBD" }],
  creator: "Cloud PerfumeBD",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Cloud PerfumeBD",
    title: "Cloud PerfumeBD — Bangladesh's Fragrance Marketplace",
    description:
      "Discover, decant & deal — Bangladesh's community-powered marketplace for genuine perfumes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cloud PerfumeBD — Bangladesh's Fragrance Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud PerfumeBD — Bangladesh's Fragrance Marketplace",
    description:
      "Discover, decant & deal — Bangladesh's community-powered marketplace for genuine perfumes.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth selection:bg-[#d4af37] selection:text-white">
      <body suppressHydrationWarning className="min-h-screen antialiased text-[#1a1a1a]">
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

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}