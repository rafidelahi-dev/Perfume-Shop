// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

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
  ...((GOOGLE_SITE_VERIFICATION || BING_SITE_VERIFICATION) && {
    verification: {
      ...(GOOGLE_SITE_VERIFICATION && { google: GOOGLE_SITE_VERIFICATION }),
      ...(BING_SITE_VERIFICATION && { other: { "msvalidate.01": BING_SITE_VERIFICATION } }),
    },
  }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth selection:bg-[#d4af37] selection:text-white">
      {GTM_ID && (
        <Script id="gtm" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="beforeInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
      )}
      <body suppressHydrationWarning className="min-h-screen antialiased text-[#1a1a1a]">
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}

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