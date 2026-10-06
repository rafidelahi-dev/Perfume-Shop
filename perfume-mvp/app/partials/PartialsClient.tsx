"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PerfumeGrid from "@/app/perfumes/components/PerfumeGrid";
import { useAuthProfile } from "@/lib/hooks/useAuthProfile";
import type { PerfumeListing } from "@/types/perfume";

// Where "Drop yours here" lands. Signed-in sellers go straight to the
// listing form with Partial preselected; everyone else passes through
// signup first and is returned to the same form afterwards.
const DROP_TARGET = "/dashboard/listings?type=partial";

export default function PartialsClient({ listings }: { listings: PerfumeListing[] }) {
  const { isAuthenticated } = useAuthProfile();
  const [q, setQ] = useState("");

  const dropHref = isAuthenticated
    ? DROP_TARGET
    : `/signup?next=${encodeURIComponent(DROP_TARGET)}`;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return listings;
    return listings.filter((l) =>
      `${l.brand ?? ""} ${l.sub_brand ?? ""} ${l.perfume_name ?? ""}`.toLowerCase().includes(needle)
    );
  }, [listings, q]);

  return (
    <div className="min-h-screen">
      <Header />

      <section className="bg-gradient-to-br from-[#f9f6ef] via-[#f5f1e8] to-[#efe9dc] pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#111] sm:text-5xl">
            Partial perfumes
          </h1>
          <p className="mt-3 max-w-xl text-[#444]">
            Partially used bottles from fragheads across Bangladesh, newest first. Contact sellers
             directly.
          </p>

          {/* Phone: just the button. sm+: a call-out card with a short pitch. */}
          <Link
            href={dropHref}
            aria-label="Drop your partial here"
            className="group mt-8 flex items-center gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37] sm:rounded-2xl sm:border-l-4 sm:border-[#d4af37] sm:bg-white sm:py-4 sm:pl-5 sm:pr-4 sm:shadow-sm sm:transition sm:hover:shadow-md"
          >
            <span className="hidden min-w-0 flex-1 sm:block">
              <span className="block font-serif text-lg font-semibold text-[#1a1a1a]">
                Got a partial gathering dust?
              </span>
              <span className="block text-sm text-[#666]">
                Post it here. Buyers across Bangladesh message you directly.
              </span>
            </span>
            <span className="w-full shrink-0 rounded-full bg-[#1a1a1a] px-6 py-3 text-center text-sm font-medium text-white transition group-hover:bg-[#d4af37] group-hover:text-[#1a1a1a] sm:w-auto">
              <span className="sm:hidden">Drop your partials here</span>
              <span className="hidden sm:inline">Drop yours here</span>
            </span>
          </Link>
          <p className="mt-2 px-1 text-xs text-[#777]">Free to post. Takes about a minute.</p>
        </div>
      </section>

      <div className="mx-auto max-w-[110rem] px-4 py-10">
        <div className="relative mb-8 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
          <input
            className="w-full rounded-2xl border border-black/10 bg-white px-12 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20"
            placeholder="Search brand or perfume…"
            aria-label="Search partial perfumes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {listings.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="font-serif text-2xl text-[#1a1a1a]">No partials up yet</p>
            <p className="mt-2 text-[#666]">Be the first to drop one.</p>
            <Link
              href={dropHref}
              className="mt-5 inline-block rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-medium text-white hover:bg-[#333]"
            >
              Drop yours here
            </Link>
          </div>
        ) : (
          <PerfumeGrid perfumes={filtered} isLoading={false} error={null} />
        )}
      </div>

      <Footer />
    </div>
  );
}
