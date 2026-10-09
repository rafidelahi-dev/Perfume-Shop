// app/page.tsx
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Link from "next/link";
import TrendingSection from "@/components/TrendingSection";
import HeroCarousel from "@/components/HeroCarousel";
import LatestArticles from "@/components/LatestArticles";
import JustDropped from "@/components/JustDropped";
import { SITE_URL, SUPPORT_EMAIL, SOCIAL_LINKS } from "@/lib/site";

export const revalidate = 60;

async function fetchInitialTrending() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("perfume_score")
    .select(
      "id, brand, perfume_name, sub_brand, min_price, representative_images, click_score, last_clicked_at"
    )
    .order("click_score", { ascending: false })
    .order("last_clicked_at", { ascending: false })
    .limit(5);

  if (error) return [];
  return data ?? [];
}

export const metadata: Metadata = {
  title: { absolute: "Cloud PerfumeBD — Bangladesh's Fragrance Marketplace" },
  description:
    "Discover, decant & deal — Bangladesh's community-powered marketplace for genuine perfumes. Buy and sell full bottles, partials, and decants.",
  alternates: { canonical: "https://www.cloudperfumebd.com" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Cloud PerfumeBD",
  url: "https://www.cloudperfumebd.com",
  description:
    "Bangladesh's community-powered marketplace for genuine perfumes. Discover, buy, and sell full bottles, partials, and decants.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.cloudperfumebd.com/perfumes?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Cloud PerfumeBD",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: SUPPORT_EMAIL,
  ...([SOCIAL_LINKS.facebook, SOCIAL_LINKS.instagram].filter(Boolean).length > 0 && {
    sameAs: [SOCIAL_LINKS.facebook, SOCIAL_LINKS.instagram].filter(Boolean),
  }),
};

export default async function Home() {
  const initialTrending = await fetchInitialTrending();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Header />

      {/* Enhanced Hero Section */}
      <section className="relative w-full overflow-hidden min-h-[90vh] flex items-center justify-center pb-10 pt-20">
        {/* Background Image Carousel (client component) */}
        <HeroCarousel />

        <div className="relative z-10 mx-auto max-w-7xl text-center px-6 sm:px-12 flex flex-col items-center">

          <h1 className="text-5xl font-light tracking-tight text-[#111] sm:text-7xl lg:text-8xl mb-8">
            Discover Your
            <span className="block mt-2 font-serif italic text-[#d4af37] drop-shadow-sm">Signature Scent</span>
          </h1>

          <p className="mt-2 text-lg sm:text-xl text-[#111] max-w-2xl mx-auto leading-relaxed font-light">
            {"Bangladesh's first community driven marketplace. Every sell post in one place: decants, partials and full bottles. Know what's worth your money and compare real prices."}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/perfumes"
              className="btn hover-lift bg-[#1a1a1a] text-white hover:bg-black border-none text-base px-10 py-4 rounded-full shadow-xl hover:shadow-2xl duration-300"
            >
              Browse Sell Posts
            </Link>
            <Link
              href="/partials"
              className="btn hover-lift bg-white/60 backdrop-blur-md border border-[#d4af37] text-[#1a1a1a] hover:bg-[#d4af37] text-base px-10 py-4 rounded-full shadow-sm hover:shadow-md duration-300"
            >
              Drop Your Partial
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="sm:mt-8 pt-8 border-t border-black/5 grid grid-cols-3 gap-8 sm:gap-16 text-xs sm:text-sm font-medium tracking-wide text-[#666] uppercase">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[#d4af37] text-lg">✦</span>
              <span className="font-bold">Community Driven</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[#d4af37] text-lg">✦</span>
              <span className="font-bold">Nationwide</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[#d4af37] text-lg">✦</span>
              <span className="font-bold">Transparency</span>
            </div>
          </div>
        </div>
      </section>

      {/* Freshest sell posts, so phone visitors see real stock under the banner */}
      <JustDropped />

      {/* Trending Now */}
      <TrendingSection initialPerfumes={initialTrending} />

      {/* Latest Articles */}
      <LatestArticles />

      {/* CTA Section */}
      <section className="relative py-12 sm:py-24 px-6 sm:px-12 overflow-hidden">
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
