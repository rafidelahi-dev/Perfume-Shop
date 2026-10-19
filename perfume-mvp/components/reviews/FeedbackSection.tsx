"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useSessionUserId } from "@/lib/hooks/useSessionUserId";
import type { PublicReview, ReviewAggregate } from "@/lib/queries/perfumes";
import {
  castVote,
  deleteReview,
  fetchFeedbackPublic,
  fetchMyPerfumeState,
  reportReview,
  saveRating,
  type MyPerfumeState,
} from "@/lib/queries/reviews";
import type { UserVote } from "@/lib/polls";
import StarRater from "./StarRater";
import PollsPanel from "./PollsPanel";
import ReviewComposer from "./ReviewComposer";
import ReviewList from "./ReviewList";

type Props = {
  perfumeId: string;
  slug: string;
  perfumeName: string;
  initialAggregate: ReviewAggregate;
  initialReviews: PublicReview[];
};

export default function FeedbackSection({
  perfumeId,
  slug,
  perfumeName,
  initialAggregate,
  initialReviews,
}: Props) {
  const router = useRouter();
  const userId = useSessionUserId();
  const loggedIn = typeof userId === "string";

  const [aggregate, setAggregate] = useState(initialAggregate);
  const [reviews, setReviews] = useState(initialReviews);
  const [mine, setMine] = useState<MyPerfumeState | null>(null);
  const [composing, setComposing] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const resumed = useRef(false);

  const refreshPublic = useCallback(async () => {
    try {
      const fresh = await fetchFeedbackPublic(perfumeId);
      setAggregate(fresh.aggregate);
      setReviews(fresh.reviews);
    } catch {
      /* keep what we have */
    }
  }, [perfumeId]);

  const refreshMine = useCallback(async () => {
    try {
      setMine(await fetchMyPerfumeState(perfumeId));
    } catch {
      /* ignore */
    }
  }, [perfumeId]);

  useEffect(() => {
    if (loggedIn) void refreshMine();
    else if (userId === null) setMine(null);
  }, [loggedIn, userId, refreshMine]);

  const loginUrl = (query: string) =>
    `/join?next=${encodeURIComponent(`/fragrance/${slug}${query}`)}`;

  const rate = useCallback(
    async (n: number) => {
      try {
        await saveRating(perfumeId, n);
        await Promise.all([refreshMine(), refreshPublic()]);
        toast.success("Rating saved. Add a comment?");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save rating");
      }
    },
    [perfumeId, refreshMine, refreshPublic]
  );

  function onStar(n: number) {
    if (!loggedIn) {
      router.push(loginUrl(`?rate=${n}`));
      return;
    }
    void rate(n);
  }

  function onAddReview() {
    if (!loggedIn) {
      router.push(loginUrl("?review=1"));
      return;
    }
    setComposing(true);
  }

  // Resume after login: ?rate=N or ?review=1, applied once then stripped.
  useEffect(() => {
    if (!loggedIn || resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const r = Number(params.get("rate"));
    const wantsReview = params.get("review") === "1";
    if (!(r >= 1 && r <= 5) && !wantsReview) return;
    resumed.current = true;
    window.history.replaceState(null, "", `/fragrance/${slug}`);
    if (r >= 1 && r <= 5) void rate(r).then(() => setComposing(true));
    else setComposing(true);
  }, [loggedIn, slug, rate]);

  // Shared link (?review=1): guide visitors, logged in or not, to the section.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") !== "1") return;
    document.getElementById("reviews-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (composing) composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [composing]);

  async function onVote(dimension: string, option: string, value: -1 | 0 | 1) {
    const prev = mine;
    setMine((m) => {
      if (!m) return m;
      const single = !!aggregate && ["gender", "longevity", "projection", "value"].includes(dimension);
      const rest = m.votes.filter(
        (v) => !(v.dimension === dimension && (single || v.option === option))
      );
      const votes: UserVote[] = value === 0 ? rest : [...rest, { dimension, option, value }];
      return { ...m, votes };
    });
    try {
      await castVote(perfumeId, dimension, option, value);
      await refreshPublic();
    } catch (e) {
      setMine(prev);
      toast.error(e instanceof Error ? e.message : "Could not save vote");
    }
  }

  async function onDelete() {
    if (!mine?.review) return;
    if (!window.confirm("Delete your review?")) return;
    try {
      await deleteReview(mine.review.id);
      setComposing(false);
      await Promise.all([refreshMine(), refreshPublic()]);
      toast.success("Review deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  }

  async function onReport(reviewId: string) {
    const reason = window.prompt("Why are you reporting this review?");
    if (!reason?.trim()) return;
    try {
      await reportReview(reviewId, reason.trim());
      toast.success("Reported. Thanks.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not report");
    }
  }

  const myReview = mine?.review ?? null;

  return (
    <div className="space-y-12">
      <section aria-labelledby="polls-heading">
        <h2 id="polls-heading" className="text-xl font-semibold mb-1">
          Community Read
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {loggedIn
            ? "Tap to vote. Takes a second."
            : "What Cloud members say. Log in to add your vote."}
        </p>
        <PollsPanel
          polls={aggregate.polls}
          voterCounts={aggregate.voter_counts}
          myVotes={loggedIn ? (mine?.votes ?? []) : null}
          onVote={onVote}
        />
      </section>

      <section aria-labelledby="reviews-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2 id="reviews-heading" className="text-xl font-semibold">
              Reviews
            </h2>
            {aggregate.review_count > 0 && aggregate.rating_avg != null && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <Star size={16} className="fill-[#d4af37] text-[#d4af37]" />
                <strong>{aggregate.rating_avg.toFixed(1)}</strong>
                <span className="text-gray-400">
                  ({aggregate.review_count} review{aggregate.review_count > 1 ? "s" : ""})
                </span>
              </p>
            )}
          </div>
          {!composing && (
            <button
              type="button"
              onClick={onAddReview}
              className="rounded-full border border-black px-5 py-2 text-sm hover:bg-black hover:text-white transition-colors"
            >
              {myReview ? "Edit your review" : "Add a review"}
            </button>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="mb-2 text-sm text-gray-600">
            {myReview ? "Your rating" : `How do you rate ${perfumeName}?`}
          </p>
          <StarRater value={myReview?.rating ?? null} onRate={onStar} />
          {myReview && !composing && (
            <button
              type="button"
              onClick={onDelete}
              className="mt-3 text-xs text-gray-400 hover:text-red-500"
            >
              Delete my review
            </button>
          )}
          {composing && myReview && (
            <div ref={composerRef}>
              <ReviewComposer
                reviewId={myReview.id}
                initial={{
                  review_text: myReview.review_text,
                  images: myReview.images,
                  owns_bottle: myReview.owns_bottle,
                  knows_seller: myReview.knows_seller,
                  is_anonymous: myReview.is_anonymous,
                }}
                onCancel={() => setComposing(false)}
                onSaved={() => {
                  setComposing(false);
                  void Promise.all([refreshMine(), refreshPublic()]);
                }}
              />
            </div>
          )}
          {composing && !myReview && (
            <p className="mt-3 text-sm text-gray-500">Pick a star first, then add your words.</p>
          )}
        </div>

        <div className="mt-6">
          <ReviewList reviews={reviews} onReport={loggedIn ? onReport : undefined} />
        </div>
      </section>
    </div>
  );
}
