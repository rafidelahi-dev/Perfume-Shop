"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Star } from "lucide-react";
import { toast } from "sonner";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import {
  deleteSellerReview,
  fetchMySellerReview,
  fetchSellerFeedback,
  reportSellerReview,
  saveSellerReview,
  type MySellerReview,
  type PublicSellerReview,
  type SellerRating,
} from "@/lib/queries/sellerReviews";
import StarRater from "./StarRater";

type Props = {
  sellerId: string;
  username: string;
  sellerName: string;
  initialRating: SellerRating;
  initialReviews: PublicSellerReview[];
};

const MAX_COMMENT = 500;

export default function SellerRatingSection({
  sellerId,
  username,
  sellerName,
  initialRating,
  initialReviews,
}: Props) {
  const router = useRouter();
  const userId = useSessionUserId();
  const loggedIn = typeof userId === "string";
  const isSelf = userId === sellerId;

  const [rating, setRating] = useState(initialRating);
  const [reviews, setReviews] = useState(initialReviews);
  const [mine, setMine] = useState<MySellerReview | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);

  const refreshPublic = useCallback(async () => {
    try {
      const fresh = await fetchSellerFeedback(sellerId);
      setRating(fresh.rating);
      setReviews(fresh.reviews);
    } catch {
      /* keep what we have */
    }
  }, [sellerId]);

  const refreshMine = useCallback(async () => {
    try {
      setMine(await fetchMySellerReview(sellerId));
    } catch {
      /* ignore */
    }
  }, [sellerId]);

  useEffect(() => {
    if (loggedIn && !isSelf) void refreshMine();
    else if (userId === null) setMine(null);
  }, [loggedIn, isSelf, userId, refreshMine]);

  const loginUrl = (query: string) =>
    `/join?next=${encodeURIComponent(`/perfumes/${username}${query}`)}`;

  const rate = useCallback(
    async (n: number) => {
      try {
        await saveSellerReview(sellerId, n);
        await Promise.all([refreshMine(), refreshPublic()]);
        toast.success("Rating saved. Add a line?");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save rating");
      }
    },
    [sellerId, refreshMine, refreshPublic]
  );

  function onStar(n: number) {
    if (!loggedIn) {
      router.push(loginUrl(`?rate=${n}`));
      return;
    }
    void rate(n);
  }

  // Shared link (?review=1): guide visitors, logged in or not, to the section.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") !== "1") return;
    document.getElementById("seller-rating-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function startComment() {
    setComment(mine?.comment ?? "");
    setCommenting(true);
  }

  function onAddReview() {
    if (!loggedIn) {
      router.push(loginUrl("?review=1"));
      return;
    }
    startComment();
  }

  // Resume after login: ?rate=N or ?review=1, applied once then stripped.
  useEffect(() => {
    if (!loggedIn || resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const r = Number(params.get("rate"));
    const wantsReview = params.get("review") === "1";
    if (!(r >= 1 && r <= 5) && !wantsReview) return;
    resumed.current = true;
    window.history.replaceState(null, "", `/perfumes/${username}`);
    if (isSelf) return;
    if (r >= 1 && r <= 5) void rate(r).then(() => setCommenting(true));
    else setCommenting(true);
  }, [loggedIn, isSelf, username, rate]);

  async function saveComment() {
    if (!mine) return;
    setBusy(true);
    try {
      await saveSellerReview(sellerId, mine.rating, comment.trim() || null);
      setCommenting(false);
      await Promise.all([refreshMine(), refreshPublic()]);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!mine || !window.confirm("Delete your seller rating?")) return;
    try {
      await deleteSellerReview(mine.id);
      setCommenting(false);
      await Promise.all([refreshMine(), refreshPublic()]);
      toast.success("Rating deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  async function onReport(reviewId: string) {
    const reason = window.prompt("Why are you reporting this?");
    if (!reason?.trim()) return;
    try {
      await reportSellerReview(reviewId, reason.trim());
      toast.success("Reported. Thanks.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not report");
    }
  }

  return (
    <section aria-labelledby="seller-rating-heading" className="mb-10 rounded-2xl border border-black/5 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 id="seller-rating-heading" className="text-lg font-serif font-semibold text-[#1a1a1a]">
            Seller ratings
          </h2>
          {rating.rating_count > 0 && rating.rating_avg != null ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <Star size={16} className="fill-[#d4af37] text-[#d4af37]" />
              <strong>{rating.rating_avg.toFixed(1)}</strong>
              <span className="text-gray-400">
                ({rating.rating_count} rating{rating.rating_count > 1 ? "s" : ""})
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-400">No ratings yet.</p>
          )}
        </div>
        {!isSelf && !commenting && (
          <button
            type="button"
            onClick={onAddReview}
            className="rounded-full border border-black px-5 py-2 text-sm hover:bg-black hover:text-white transition-colors"
          >
            {mine ? "Edit your note" : "Rate this seller"}
          </button>
        )}
      </div>

      {!isSelf && (
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-2 text-sm text-gray-600">
            {mine ? "Your rating" : `Dealt with ${sellerName}? Rate them.`}
          </p>
          <StarRater value={mine?.rating ?? null} onRate={onStar} />
          {mine && !commenting && (
            <button type="button" onClick={onDelete} className="mt-3 text-xs text-gray-400 hover:text-red-500">
              Delete my rating
            </button>
          )}
          {commenting && mine && (
            <div className="mt-3 space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                rows={3}
                placeholder="One line about your experience (optional)"
                className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#d4af37]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveComment}
                  disabled={busy}
                  className="rounded-full bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setCommenting(false)} className="px-3 py-2 text-sm text-gray-500">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {commenting && !mine && (
            <p className="mt-3 text-sm text-gray-500">Pick a star first, then add your line.</p>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100">
          {reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{r.display_name}</span>
                <span className="flex" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={13}
                      className={n <= r.rating ? "fill-[#d4af37] text-[#d4af37]" : "text-gray-300"}
                    />
                  ))}
                </span>
                {loggedIn && !isSelf && (
                  <button
                    type="button"
                    onClick={() => onReport(r.id)}
                    aria-label="Report rating"
                    className="ml-auto text-gray-300 hover:text-red-500"
                  >
                    <Flag size={14} />
                  </button>
                )}
              </div>
              {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
