"use client";

import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* HERO SECTION */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl font-semibold text-[#1a1a1a]">
          About <span className="text-[#d4af37]">Cloud PerfumeBD</span>
        </h1>
        <p className="text-lg text-[#555] max-w-2xl mx-auto">
          A modern fragrance marketplace built for collectors, connoisseurs,
          and curious explorers. Discover, share, and trade perfumes with
          confidence.
        </p>
        <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/About/bangladesh.jpg"
            alt="Perfume bottles"
            fill
            className="object-cover"
          />
        </div>
      </section>

      {/* PURPOSE SECTION */}
      <section className="space-y-8">
        <h2 className="text-3xl font-light text-[#1a1a1a]">Our Purpose</h2>

        <div className="space-y-6 text-[#444] leading-relaxed">
          <p>
            Cloud PerfumeBD is built to make all types of fragrances accessible,
            transparent, and enjoyable for everyone. We eliminate the exaustion of searching for perfume/decant sellers
            and cost variation traditionally associated with exploring perfumes.
          </p>

          <ul className="space-y-4 list-disc pl-6">
            <li>
              <strong>Accessibility:</strong> Buy or sell decants, partials,
              and full bottles at fair community-driven prices.
            </li>
            <li>
              <strong>Discovery:</strong> Explore hundreds of authentic
              fragrances with detailed information and photos.
            </li>
            <li>
              <strong>Transparency:</strong> Each seller must provide some sort of 
              option to reach out to them. Either via whatsapp or facebook or personal number.
              That way the buyer can confirm any details before going through with the purchase with them. 
              <i>Please do not approach who limits their contact options or doesn't repond properly</i>
            </li>
          </ul>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section className="space-y-10">
        <h2 className="text-3xl font-light text-[#1a1a1a]">
          Why Cloud PerfumeBD Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Built for Enthusiasts",
              desc: "Every feature—from filters to listing types—is designed for perfume lovers.",
            },
            {
              title: "Community Powered",
              desc: "Buy directly from real collectors with transparent listings and authentic scents.",
            },
            {
              title: "Precision Discovery",
              desc: "Search by brand, price, type, or name to find exactly what fits your style.",
            },
            {
              title: "Review and Rate Sellers",
              desc: "Always promote those who are better in terms of service and quality. The platform gives everyone a fair chance to be noticed based on their performance.",
            },
          ].map((box) => (
            <div
              key={box.title}
              className="rounded-2xl p-6 bg-[#fffdf7] border border-black/5 shadow-sm"
            >
              <h3 className="font-semibold text-[#1a1a1a] mb-2 text-lg">
                {box.title}
              </h3>
              <p className="text-sm text-[#555]">{box.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* IMAGE SECTION */}
      <section className="relative w-full h-72 rounded-3xl overflow-hidden shadow-lg">
        <Image
          src="/About/community1.jpg"
          alt="Fragrance community"
          fill
          className="object-cover"
        />
      </section>

      {/* VISION */}
      <section className="space-y-6">
        <h2 className="text-3xl font-light text-[#1a1a1a]">Our Vision</h2>
        <p className="text-[#444] leading-relaxed">
          We aim to become the Bangladesh's largest fragrance discovery platform—
          empowering everyone to explore new scents, share their collections,
          and connect with the vast community of fragrance enthusiasts.
        </p>
      </section>

      {/* FOUNDER MESSAGE */}
      <section className="space-y-4">
        <h2 className="text-2xl font-light text-[#1a1a1a]">Founder’s Note</h2>
        <p className="text-[#444] leading-relaxed">
          Perfume is meant to be shared. Many collectors own bottles that sit
          untouched, beautiful scents waiting for appreciation. Cloud PerfumeBD exists to breathe new life into these fragrances and help
          people discover their signature scent with confidence.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="text-center space-y-4 mt-10">
        <h2 className="text-3xl font-light text-[#1a1a1a]">
          Join the Fragrance Community
        </h2>
        <p className="text-[#555] max-w-xl mx-auto">
          Explore new scents, share your collection, and connect with perfume
          lovers around the world.
        </p>
        <Link
          href="/perfumes"
          className="inline-block rounded-full bg-[#1a1a1a] text-white px-8 py-3 text-sm hover:opacity-90"
        >
          Explore the Collection
        </Link>
      </section>
    </div>
    <Footer/>
    </>
  );
}
