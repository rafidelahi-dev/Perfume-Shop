"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { fetchMyReviewActivity, fetchPerfumesToRate } from "@/lib/queries/reviews";
import { qk } from "@/lib/queries/key";

const card =
  "rounded-3xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-6";

type Props = { userId: string | null | undefined; username: string | null | undefined };

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied. Paste it in WhatsApp or Messenger.");
  } catch {
    toast.error("Could not copy. Select the text and copy it.");
  }
}

export default function CommunityCards({ userId, username }: Props) {
  const enabled = !!userId;
  const activity = useQuery({
    queryKey: qk.reviewActivity(userId),
    queryFn: fetchMyReviewActivity,
    enabled,
  });
  const toRate = useQuery({
    queryKey: qk.perfumesToRate(userId),
    queryFn: () => fetchPerfumesToRate(6),
    enabled,
  });
  const [slug, setSlug] = useState("");

  const items = activity.data ?? [];
  const totalVoters = items.reduce((s, a) => s + a.other_voters, 0);
  const new7 = items.reduce((s, a) => s + a.new_reviews_7d + a.new_votes_7d, 0);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const sellerLink = username ? `${origin}/perfumes/${username}?review=1` : "";
  const fragranceLink = slug ? `${origin}/fragrance/${slug}?review=1` : "";

  return (
    <>
      {username && (
        <section className={card} aria-labelledby="ask-friends-heading">
          <div className="flex items-center justify-between">
            <h2 id="ask-friends-heading" className="font-serif text-xl font-semibold text-[#1a1a1a]">
              Ask friends for reviews
            </h2>
            <Share2 className="h-4 w-4 text-[#8a6d00]" aria-hidden />
          </div>
          <p className="mt-2 text-sm text-[#666]">
            Friends can rate you in two taps. Their review shows a &ldquo;knows seller&rdquo; badge if
            they say so, so buyers know it is honest.
          </p>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() =>
                copy(`Hi! Can you leave a quick rating for my perfume shop on Cloud PerfumeBD? It takes 10 seconds: ${sellerLink}`)
              }
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-5 text-sm font-semibold text-white transition hover:bg-[#333]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Copy message: rate my shop
            </button>

            {items.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Choose a fragrance"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="min-h-[44px] flex-1 rounded-full border border-gray-300 px-4 text-sm"
                >
                  <option value="">Or ask about a fragrance…</option>
                  {items.map((a) => (
                    <option key={a.perfume_id} value={a.slug}>
                      {a.brand} {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!slug}
                  onClick={() =>
                    copy(`What do you think of this fragrance? Rate it or vote on Cloud PerfumeBD: ${fragranceLink}`)
                  }
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-gray-300 px-5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" aria-hidden /> Copy
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className={card} aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="font-serif text-xl font-semibold text-[#1a1a1a]">
            Your reviews are being read
          </h2>
          <p className="mt-2 text-sm text-[#666]">
            {totalVoters > 0
              ? `${totalVoters} ${totalVoters === 1 ? "person" : "people"} voted on perfumes you reviewed.`
              : "No one else has voted on your perfumes yet."}
            {new7 > 0 && ` ${new7} new this week.`}
          </p>
          <ul className="mt-3 divide-y divide-gray-100">
            {items.slice(0, 5).map((a) => (
              <li key={a.perfume_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/fragrance/${a.slug}`} className="min-w-0 truncate font-medium hover:underline">
                  {a.brand} {a.name}
                </Link>
                <span className="shrink-0 text-xs text-[#666]">
                  {a.other_reviews} reviews · {a.other_voters} voters
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(toRate.data?.length ?? 0) > 0 && (
        <section className={card} aria-labelledby="rate-more-heading">
          <h2 id="rate-more-heading" className="font-serif text-xl font-semibold text-[#1a1a1a]">
            Rate more fragrances
          </h2>
          <p className="mt-2 text-sm text-[#666]">Every rating helps the next buyer decide.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {toRate.data!.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/fragrance/${p.slug}`}
                  className="inline-flex min-h-[40px] items-center rounded-full border border-gray-300 px-4 text-sm transition hover:bg-gray-50"
                >
                  {p.brand} {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
