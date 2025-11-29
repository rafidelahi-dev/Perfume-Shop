"use client";

import Link from "next/link";
import Image from "next/image";

export default function UnderConstruction() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center bg-[#faf7f2]">
      
      <div className="max-w-md mx-auto">
        <Image
          src="/underConstruction.png" 
          alt="Under Construction"
          width={300}
          height={300}
          className="mx-auto mb-6 opacity-90"
        />

        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">
          This page is still being built
        </h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          Our team is working hard to finish this section.  
          Thank you for your patience — exciting things are coming soon!
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            Return to Home
          </Link>

          <Link
            href="/perfumes"
            className="block text-sm text-gray-700 underline hover:text-black"
          >
            Browse perfumes instead →
          </Link>
        </div>
      </div>
    </div>
  );
}
