"use client";

import { useEffect, useState, type ReactNode } from "react";

type Tab = "listings" | "reviews";

export default function ProfileTabs({
  listingCount,
  reviewCount,
  listings,
  reviews,
}: {
  listingCount: number;
  reviewCount: number;
  listings: ReactNode;
  reviews: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("listings");

  // The header's Rate button links to #reviews, which opens the Reviews tab.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#reviews") setTab("reviews");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "listings", label: `Listings (${listingCount})` },
    { id: "reviews", label: `Reviews (${reviewCount})` },
  ];

  return (
    <div id="reviews">
      <div role="tablist" className="mb-6 flex border-b border-black/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 flex-1 border-b-2 px-4 text-sm font-medium transition md:flex-none ${
              tab === t.id ? "border-[#d4af37] text-[#1a1a1a]" : "border-transparent text-gray-500 hover:text-[#1a1a1a]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "listings"}>{listings}</div>
      <div hidden={tab !== "reviews"}>{reviews}</div>
    </div>
  );
}
